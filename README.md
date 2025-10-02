# Bot Discord – Hệ thống BASIC, TENT, CAMPING, và Quản trị

## Yêu cầu môi trường
- Node.js >= 18.17
- Token và thông tin ứng dụng Discord

## Cài đặt
```bash
npm install
```

## Cấu hình biến môi trường
1. Sao chép file `.env.example` thành `.env`:
```bash
cp .env.example .env
```

2. Chỉnh sửa file `.env` và điền thông tin thực tế:
```env
DISCORD_TOKEN=YOUR_BOT_TOKEN_HERE
DISCORD_CLIENT_ID=YOUR_CLIENT_ID_HERE
DISCORD_GUILD_ID=YOUR_GUILD_ID_HERE
PREFIX=lv 
```

3. Cập nhật Role IDs trong `modules/manager.ts`:
```typescript
const MANAGER_ROLES = ['YOUR_MANAGER_ROLE_ID_1', 'YOUR_MANAGER_ROLE_ID_2', 'YOUR_MANAGER_ROLE_ID_3', 'YOUR_MANAGER_USER_ID'];
```

Ghi chú: `PREFIX` sẽ được hiểu là có khoảng trắng sau, ví dụ `lv `.

## Chạy bot
- Chạy dev (TSX watch):
```bash
npm run dev
```
- Build + start:
```bash
npm run build && npm start
```
- Đăng ký slash toàn cầu (cẩn thận vì cache của Discord):
```bash
npm run register
```

## Cấu trúc chính
- `src/index.ts`: Khởi động bot, xử lý interaction (slash, nút) và message (prefix).
- `src/lib/loader.ts`: Nạp lệnh từ `src/modules/` (hỗ trợ export đơn hoặc mảng `slash(es)`/`prefix(es)`) và đăng ký slash trong guild.
- `src/store/store.ts`: Lưu trữ JSON (users, lều, kho, lửa, daily, quest...). File dữ liệu nằm tại `./data/db.json`.
- `src/modules/`: Các nhóm lệnh theo tính năng.

## Quy ước tiền tố
- Hỗ trợ 2 tiền tố: `lv ` (người dùng) và `lv!` (quản trị nhanh).

## Nhóm lệnh BASIC (prefix `lv `)
- `lv daily`: Điểm danh hằng ngày. Thưởng dựa theo streak (GMT+7).
  - Ngày 1: 100 LVC; ngày 2: 200 LVC; ngày 3: 300 LVC; >7 ngày: ngẫu nhiên 700-1999 LVC; quên sẽ reset streak.
- `lv cash`: Xem số dư của bản thân.
- `lv info`: Hiển thị thông tin server hiện tại.
- `lv give <@user> <số tiền>`: Chuyển LVC cho người khác.
- `lv bxh`: Bảng xếp hạng theo số dư cao nhất.
- `lv quest`: Xem 3 nhiệm vụ ngày, có nút “Làm Mới” (xác nhận, trừ 2000 LVC) để bốc lại.

## Nhóm lệnh CAMPING (prefix `lv `)
- `lv pickup`: Nhặt gỗ ngẫu nhiên (theo tỷ lệ/khối lượng yêu cầu).
- `lv inv`: Xem túi đồ cá nhân (gỗ theo mã: 01–05).
- `lv firecheck`: Kiểm tra lửa của lều còn bao lâu.
- `lv firemake`: Tạo lửa cho lều (cần 3×“03” + 2×“04”, trừ 300 LVC). Nếu lều có lửa rồi sẽ báo.
- `lv addwood <mã> <kg>`: Thêm gỗ vào kho của lều.
- `lv givewood <@user> <mã> <kg>`: Cho người khác gỗ từ túi cá nhân.
- `lv usewood <mã> <kg>`: Dùng gỗ trong kho lều để kéo dài thời gian cháy (1kg = +1 phút).

## Nhóm lệnh TENT (lều)
- Slash: `/tentowner <@user> <tên lều> <role>`: Chỉ role `1409811217048141896` được phép. Gán chủ lều và role.
- Prefix:
  - `lv tent add <@user>`: Chủ lều thêm thành viên.
  - `lv tent remove <@user>`: Chủ lều xóa thành viên.
  - `lv tent list`: Xem danh sách thành viên lều.
  - `lv tent inv`: Xem kho gỗ của lều.
  - `lv tent daily`: Điểm danh lều (nếu tất cả thành viên trong ngày đều đã điểm danh sẽ thưởng 300 LVC/người).
  - `lv tent bxh`: BXH theo tổng gỗ và thời gian lửa còn lại.
  - `lv tent quest`: Xem nhiệm vụ lều (tính chung).

## Nhóm lệnh Quản trị nhanh (prefix `lv!`)
- Chỉ các role: `1409811217048141896`, `1409850147021651999`, `1409850173718265908`.
- `lv!name <content>`: Đổi tên kênh hiện tại.
- `lv!legit <content>`: Gửi feedback/legit.

## Nhóm lệnh SERVER (slash)
- `/balance <@user?>`: Xem số dư của người được chỉ định hoặc bản thân.
- `/help`: Hướng dẫn tổng quan các lệnh.
- `/add <@user> <số tiền>`: Tạo yêu cầu thêm tiền, có nút xác nhận để thực thi.
- `/remove <@user> <số tiền>`: Tạo yêu cầu trừ tiền, có nút xác nhận để thực thi.
- `/reset <@user>`: Tạo yêu cầu reset tiền, có nút xác nhận để thực thi.

## Lưu ý kỹ thuật
- Thời gian hằng ngày tính theo múi giờ Việt Nam (GMT+7) bằng cách dịch thời gian nội bộ.
- Dữ liệu lưu dạng JSON để đơn giản hóa thử nghiệm; có thể thay bằng CSDL thực tế sau.
- Các nút xác nhận (nhiệm vụ và admin) được xử lý trong `index.ts` qua `interaction.isButton()`.

## Phát triển
- Thêm module lệnh mới bằng cách export `slash`/`prefix` hoặc mảng `slashes`/`prefixes` trong file mới tại `src/modules/`.
- Khi chạy dev, lệnh slash sẽ được đăng ký vào guild nếu có `DISCORD_GUILD_ID`.
