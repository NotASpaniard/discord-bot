import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

type UserProfile = {
  userId: string;
  balance: number;
  daily: { last: number | null; streak: number };
  inventory: Record<string, number>; // woodId -> kg
  quests: { desc: string; reward: number; done: boolean }[];
};

type DB = {
  users: Record<string, UserProfile>;
  tents: Record<string, Tent>;
};

type Tent = {
  name: string;
  ownerId: string;
  roleId: string | null;
  members: string[];
  inventory: Record<string, number>; // woodId -> kg (kho lều)
  fire: { until: number | null };
  quests: { desc: string; reward: number; done: boolean }[];
  daily: { day: number | null; completed: string[] };
};

let singleton: Store | null = null;

export function getStore(): Store {
  if (!singleton) singleton = new Store();
  return singleton;
}

export class Store {
  private file: string;
  private db: DB;

  constructor() {
    const dir = path.join(process.cwd(), 'data');
    if (!existsSync(dir)) mkdirSync(dir);
    this.file = path.join(dir, 'db.json');
    this.db = { users: {}, tents: {} };
    this.load();
  }

  private load(): void {
    try {
      const raw = readFileSync(this.file, 'utf8');
      this.db = JSON.parse(raw) as DB;
    } catch {
      this.save();
    }
  }

  save(): void {
    writeFileSync(this.file, JSON.stringify(this.db, null, 2), 'utf8');
  }

  getUser(userId: string): UserProfile {
    if (!this.db.users[userId]) {
      this.db.users[userId] = {
        userId,
        balance: 0,
        daily: { last: null, streak: 0 },
        inventory: {},
        quests: this.generateQuests()
      };
      this.save();
    }
    return this.db.users[userId];
  }

  getTopBalances(limit: number): { userId: string; balance: number }[] {
    return Object.values(this.db.users)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, limit)
      .map((u) => ({ userId: u.userId, balance: u.balance }));
  }

  getInventory(userId: string): Record<string, number> {
    return this.getUser(userId).inventory;
  }

  // Daily reward with VN time (GMT+7)
  claimDaily(userId: string): { amount: number; message: string } {
    const u = this.getUser(userId);
    const now = Date.now();
    const vnNow = now + 7 * 60 * 60 * 1000; // shift to GMT+7
    const day = Math.floor(vnNow / 86400000); // days since epoch at GMT+7
    const lastDay = u.daily.last === null ? null : Math.floor((u.daily.last + 7 * 3600000) / 86400000);

    if (lastDay === day) {
      return { amount: 0, message: 'Hôm nay bạn đã điểm danh rồi.' };
    }

    // streak logic
    if (lastDay !== null && lastDay === day - 1) {
      u.daily.streak += 1;
    } else {
      u.daily.streak = 1;
    }
    u.daily.last = now;

    let reward = 100;
    if (u.daily.streak === 2) reward = 200;
    else if (u.daily.streak === 3) reward = 300;
    else if (u.daily.streak > 7) reward = Math.floor(700 + Math.random() * (1999 - 700 + 1));
    // else default 100

    u.balance += reward;
    this.save();
    return { amount: reward, message: `Điểm danh thành công! +${reward} LVC. Streak: ${u.daily.streak}.` };
  }

  // Quests
  generateQuests(): { desc: string; reward: number; done: boolean }[] {
    const pool = [
      { desc: 'Chat 50 tin nhắn', reward: 200 },
      { desc: 'Dùng lệnh bất kỳ 5 lần', reward: 150 },
      { desc: 'Đề cập 3 người', reward: 120 },
      { desc: 'Tham gia voice 10 phút', reward: 300 },
      { desc: 'Gửi 1 ảnh', reward: 100 }
    ];
    const pick = () => pool[Math.floor(Math.random() * pool.length)];
    return [pick(), pick(), pick()].map((q) => ({ ...q, done: false }));
  }

  getDailyQuests(userId: string): { desc: string; reward: number; done: boolean }[] {
    const u = this.getUser(userId);
    // reset by VN day
    const now = Date.now();
    const vnDay = Math.floor((now + 7 * 3600000) / 86400000);
    const last = u.daily.last ? Math.floor((u.daily.last + 7 * 3600000) / 86400000) : null;
    if (last !== vnDay) {
      // regenerate quests daily independently of daily claim
      u.quests = this.generateQuests();
      this.save();
    }
    return u.quests;
  }

  refreshDailyQuests(userId: string): void {
    const u = this.getUser(userId);
    u.quests = this.generateQuests();
    this.save();
  }

  // ====== TENT (LỀU) ======
  ensureTent(name: string): Tent {
    if (!this.db.tents[name]) {
      this.db.tents[name] = {
        name,
        ownerId: '',
        roleId: null,
        members: [],
        inventory: {},
        fire: { until: null },
        quests: this.generateQuests(),
        daily: { day: null, completed: [] }
      };
      this.save();
    }
    return this.db.tents[name];
  }

  setTentOwner(name: string, ownerId: string, roleId: string | null): Tent {
    const t = this.ensureTent(name);
    t.ownerId = ownerId;
    t.roleId = roleId;
    if (!t.members.includes(ownerId)) t.members.push(ownerId);
    this.save();
    return t;
  }

  addTentMember(name: string, userId: string): Tent {
    const t = this.ensureTent(name);
    if (!t.members.includes(userId)) t.members.push(userId);
    this.save();
    return t;
  }

  removeTentMember(name: string, userId: string): Tent {
    const t = this.ensureTent(name);
    t.members = t.members.filter((m) => m !== userId);
    this.save();
    return t;
  }

  getUserTent(userId: string): Tent | null {
    return Object.values(this.db.tents).find((t) => t.members.includes(userId)) ?? null;
  }

  getTentInventory(name: string): Record<string, number> {
    return this.ensureTent(name).inventory;
  }

  addWoodToTent(name: string, woodId: string, kg: number): void {
    const inv = this.ensureTent(name).inventory;
    inv[woodId] = (inv[woodId] ?? 0) + Math.max(0, Math.floor(kg));
    this.save();
  }

  // Fire handling
  getTentFire(name: string): { until: number | null } {
    return this.ensureTent(name).fire;
  }

  startTentFire(name: string, minutes: number): void {
    const t = this.ensureTent(name);
    const now = Date.now();
    t.fire.until = now + minutes * 60000;
    this.save();
  }

  // Tent quests/daily
  getTentQuests(name: string): { desc: string; reward: number; done: boolean }[] {
    return this.ensureTent(name).quests;
  }

  refreshTentQuests(name: string): void {
    const t = this.ensureTent(name);
    t.quests = this.generateQuests();
    this.save();
  }

  markTentDaily(name: string, userId: string): { completedAll: boolean; message: string } {
    const t = this.ensureTent(name);
    const vnDay = Math.floor((Date.now() + 7 * 3600000) / 86400000);
    if (t.daily.day !== vnDay) {
      t.daily.day = vnDay;
      t.daily.completed = [];
    }
    if (!t.daily.completed.includes(userId)) t.daily.completed.push(userId);
    const completedAll = t.members.length > 0 && t.daily.completed.length === t.members.length;
    this.save();
    return { completedAll, message: `Đã điểm danh lều: ${t.daily.completed.length}/${t.members.length}` };
  }

  // ====== CAMPING (GỖ) ======
  pickupWood(userId: string): { woodId: string; kg: number; label: string } {
    // Bảng rơi theo yêu cầu
    const loot = [
      { id: '01', label: 'Gỗ Ướt', weight: 40, min: 1, max: 40 },
      { id: '02', label: 'Gỗ Mục', weight: 30, min: 1, max: 25 },
      { id: '03', label: 'Gỗ Tươi', weight: 15, min: 1, max: 15 },
      { id: '04', label: 'Gỗ Khô', weight: 10, min: 1, max: 12 },
      { id: '05', label: 'Gỗ Hiếm', weight: 5, min: 1, max: 8 }
    ];
    const total = loot.reduce((s, l) => s + l.weight, 0);
    let r = Math.random() * total;
    let picked = loot[0];
    for (const l of loot) {
      if (r < l.weight) { picked = l; break; }
      r -= l.weight;
    }
    const kg = Math.floor(picked.min + Math.random() * (picked.max - picked.min + 1));
    const userInv = this.getInventory(userId);
    userInv[picked.id] = (userInv[picked.id] ?? 0) + kg;
    this.save();
    return { woodId: picked.id, kg, label: picked.label };
  }

  consumeUserWood(userId: string, woodId: string, kg: number): boolean {
    const inv = this.getInventory(userId);
    if ((inv[woodId] ?? 0) < kg) return false;
    inv[woodId] -= kg;
    if (inv[woodId] <= 0) delete inv[woodId];
    this.save();
    return true;
  }
}


