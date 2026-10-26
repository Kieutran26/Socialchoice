# Cấp license Socialchoice bản web

Website: https://socialchoice.vercel.app

## Bạn đăng nhập thế nào?

Chọn **Đăng nhập chủ hệ thống**, nhập mật khẩu Socialchoice cũ. Tài khoản chủ hiện tại không cần mua hoặc kích hoạt license khách hàng. Facebook được kết nối riêng trong ứng dụng.

## Cấp license cho khách đã thanh toán

1. Đăng nhập chủ hệ thống, mở **Quản lý license** trong menu hoặc https://socialchoice.vercel.app/admin/licenses.
2. Nhập **email khách hàng**, **tên khách hoặc mã đơn hàng**, chọn gói.
3. Tích **Tôi đã xác minh khách thanh toán**, sau khi thực sự kiểm tra thanh toán.
4. Bấm **Tạo license**, rồi **Tải file license**. Thao tác này không thu tiền khách.
5. Gửi riêng file `.scweblicense` tải xuống cho đúng khách.

Phần **License đã cấp gần đây** cho phép tải lại cùng file, không tạo license mới. Hiện hiển thị tối đa 100 license cấp trên web gần nhất. Cấp lại email đã có trong lịch sử web sẽ bị từ chối; hãy tải lại file cũ. Các file trước đây cấp bằng Windows không tự xuất hiện trong lịch sử này; giữ file gốc để gửi lại. Chưa có chức năng nâng gói.

## Theo dõi khách đã kích hoạt

Trong **License đã cấp gần đây**, nhập email, tên khách hoặc mã đơn hàng vào **Tìm khách hàng**. Có thể kết hợp bộ lọc **Trạng thái license** và **Trạng thái kích hoạt**. Tìm kiếm chỉ áp dụng cho tối đa100license gần nhất đang có trong bảng.

Mỗi dòng có trạng thái **Đã kích hoạt / Chưa kích hoạt**, ngày kích hoạt và **Đăng nhập gần nhất**. Bấm **Cập nhật trạng thái khách** để tải thông tin mới nhất; màn hình không tự cập nhật liên tục. Thời gian theo múi giờ Việt Nam. Lần đăng nhập gần nhất gồm kích hoạt và khôi phục thành công, không cho biết khách đang online.

Ngày bắt đầu được ghi từ bản cập nhật26October2026. Tài khoản cũ vẫn hiển thị đúng trạng thái đã kích hoạt nhưng có thể ghi **Chưa ghi nhận ngày kích hoạt/đăng nhập**. Không suy đoán ngày từ ngày cấp license; lần đăng nhập thành công tiếp theo sẽ được ghi nhận. Việc kích hoạt không đồng nghĩa khách đã kết nối hoặc đăng bài mạng xã hội thành công.

## Thu hồi license

Trong **Quản lý license**, tìm đúng email trong lịch sử, bấm **Thu hồi license**, kiểm tra email trong hộp thoại rồi xác nhận. Bấm **Hủy** sẽ giữ nguyên license.

Sau khi thu hồi, trạng thái hiển thị **Đã thu hồi** và ngày thu hồi. Khách không thể đăng nhập, khôi phục hoặc kích hoạt bằng license đó; các phiên cũ bị vô hiệu hóa. Tác vụ nền và các lệnh gửi tiếp sang nền tảng phải kiểm tra lại license. Lệnh đã gửi trước khi thu hồi có thể vẫn hoàn tất.

Dữ liệu và lịch sử khách vẫn được giữ. Chưa có nút khôi phục license, nâng gói hay hoàn tiền trong chức năng này. Thu hồi không tự xóa các bài đã đăng trên mạng xã hội. Thao tác chỉ áp dụng cho license có trong lịch sử cấp trên web; công cụ Windows và file cũ không tự được nhập vào danh sách.

## Công cụ Windows vẫn dùng được khi cần

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
