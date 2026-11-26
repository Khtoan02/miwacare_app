# MiwaCare — Bộ tài liệu dự án

App thành viên Android + iOS (Expo), có database trung tâm và CRM riêng; kết nối Pancake POS ở giai đoạn sau.

> **Đọc `12-quyet-dinh-da-chot.md` trước:** các quyết định ở đó ưu tiên hơn 00–11.

## Đọc theo thứ tự

| # | Tài liệu | Trả lời câu hỏi | Người đọc chính |
|---|---|---|---|
| 00 | [Checklist chuẩn bị](00-checklist-chuan-bi.md) | Cần chuẩn bị gì trước khi code? | Bạn, Khách |
| 01 | [Phân tích hệ thống (tổng quan)](01-phan-tich-he-thong.md) | Toàn cảnh: Pancake, đồng bộ, CRM, store, bảo trì | Tất cả |
| 02 | [Yêu cầu nghiệp vụ](02-yeu-cau-nghiep-vu.md) | Làm để đạt mục tiêu gì, quy tắc điểm, phạm vi | Bạn, Khách |
| 03 | [Đặc tả chức năng](03-dac-ta-chuc-nang.md) | App và quản trị làm được gì, tiêu chí chấp nhận | Bạn, Claude |
| 04 | [Kiến trúc thông tin & luồng người dùng](04-kien-truc-thong-tin-luong-nguoi-dung.md) | Có những màn hình nào, khách đi qua chúng ra sao | Bạn, thiết kế |
| 05 | [Tiêu chuẩn thiết kế](05-tieu-chuan-thiet-ke.md) | Màu, chữ, component, văn phong | Thiết kế, Claude |
| 06 | [Kiến trúc kỹ thuật & dữ liệu](06-kien-truc-ky-thuat-du-lieu.md) | Công nghệ, môi trường, bảng dữ liệu | Claude |
| 07 | [Bảo mật & pháp lý](07-bao-mat-phap-ly.md) | Bảo vệ dữ liệu khách thế nào, luật yêu cầu gì | Bạn, luật sư, Claude |
| 08 | [Thiết kế hệ thống](08-phan-tich-thiet-ke-he-thong.md) | Module, API, xử lý lỗi, kiểm thử | Claude |
| 09 | [Luồng hoạt động](09-luong-hoat-dong.md) | Từng luồng hệ thống chạy theo thứ tự nào | Claude |
| 10 | [Use case](10-use-case.md) | Ai làm được gì với hệ thống | Tất cả |
| 11 | [Kế hoạch triển khai](11-ke-hoach-trien-khai.md) | Làm gì, ai làm, khi nào xong | Tất cả |
| 12 | [Quyết định đã chốt](12-quyet-dinh-da-chot.md) | Đã chốt những gì, ưu tiên hơn 00–11 | Tất cả |

## Mã tham chiếu dùng chung
- `BR-xx`: quy tắc nghiệp vụ (02) · `NFR-xx`: yêu cầu phi chức năng (02)
- `F-xx`: chức năng (03) · `S-xx`: màn hình (04) · `UF-x`: luồng người dùng (04)
- `AF-xx`: luồng hoạt động hệ thống (09) · `UC-xx`: use case (10) · `GĐx`: giai đoạn (11)

## Quy ước
- Mục có nhãn **[GIẢ ĐỊNH]** hoặc **TBD**: chưa chốt. Khi chốt thì sửa và ghi ngày.
- Sơ đồ viết bằng Mermaid: xem được trên GitHub, VS Code (cài extension Markdown Preview Mermaid) hoặc mermaid.live.
