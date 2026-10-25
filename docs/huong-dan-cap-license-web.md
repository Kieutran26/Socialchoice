# Cấp license Socialchoice bản web

Website: https://socialchoice.vercel.app

## Bạn đăng nhập thế nào?

Chọn **Đăng nhập chủ hệ thống**, nhập mật khẩu Socialchoice cũ. Tài khoản chủ hiện tại không cần mua hoặc kích hoạt license khách hàng. Facebook được kết nối riêng trong ứng dụng.

## Cấp license cho khách đã thanh toán

1. Mở terminal tại thư mục `D:\Socialchoice` và chạy `pnpm run license:web:owner`.
2. Chọn **2** để cấp license. Khóa thật đã được thiết lập; không chọn tạo lại khóa.
3. Xác nhận đã kiểm tra thanh toán bằng cách nhập `YES`.
4. Nhập email khách, tên khách hoặc mã đơn hàng, rồi gói `starter`, `professional` hoặc `business`.
5. Nhập đường dẫn file mới, ví dụ `D:\Socialchoice-Private\khach-001.scweblicense`. Không dùng lại tên file đã tồn tại.
6. Gửi riêng file `.scweblicense` cho đúng khách. Không gửi bất kỳ file nào trong thư mục `web-issuer`.

Khách mở website, chọn **Kích hoạt license**, nhập đúng email được cấp, tự đặt mật khẩu ít nhất 15 ký tự và dán nội dung file license. Sau khi tạo tài khoản, khách phải lưu mã khôi phục được hiển thị. Không có dịch vụ gửi email đặt lại mật khẩu.

Sau đó khách có thể đăng nhập cùng tài khoản trên nhiều thiết bị. Đăng xuất chỉ kết thúc phiên trên thiết bị đó. Khôi phục tài khoản sẽ hủy các phiên cũ và cấp mã khôi phục mới.

## Những điểm đã chốt

- License mua một lần, gắn với một tài khoản; dùng nhiều thiết bị.
- Dữ liệu được lưu trực tuyến và tách riêng theo tài khoản.
- Ba gói hiện có cùng tính năng. Chưa chốt giá và giới hạn riêng; không quảng cáo quyền lợi khác nhau khi chưa cấu hình.
- Kết nối và đăng bài còn phụ thuộc quyền được nền tảng cấp. Việc kích hoạt license không tự cấp quyền Meta hoặc tự đăng bài.

## Giữ khóa cấp license

Khóa nằm ở `D:\Socialchoice-Private\web-issuer`, được bảo vệ cho người dùng Windows hiện tại. Không đưa thư mục này vào Git, kho công khai hoặc gửi cho khách. Cần sao lưu hệ thống/hồ sơ Windows có thể khôi phục; chép riêng thư mục sang máy khác chưa đủ để mở khóa. Bản sao lưu khôi phục độc lập chưa được kiểm chứng. Không xóa hồ sơ Windows hoặc tạo khóa mới để xử lý lỗi cấp license.
