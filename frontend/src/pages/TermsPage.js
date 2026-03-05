import React from 'react';
import { Link } from 'react-router-dom';
import TermsHeader from '../components/TermsHeader';
import TermsFooter from '../components/TermsFooter';

const TermsPage = () => {
  return (
    <div className="min-h-screen flex flex-col antialiased bg-gray-50">
      <TermsHeader />
      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-indigo-600 font-medium text-sm uppercase tracking-wide mb-2">Thông tin pháp lý</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Điều khoản Dịch vụ</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Vui lòng đọc kỹ các điều khoản này trước khi sử dụng dịch vụ lập kế hoạch cá nhân của chúng tôi.
            </p>
            <p className="text-sm text-gray-500 mt-4">Cập nhật lần cuối: 15 Tháng 10, 2023</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12">
            <div className="prose prose-indigo prose-lg max-w-none text-gray-600">
              <section className="mb-10">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-indigo-50 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3 font-bold">
                    1
                  </span>
                  Giới thiệu
                </h2>
                <p className="mb-4 leading-relaxed">
                  Chào mừng bạn đến với PlanDaily. Bằng cách truy cập trang web và sử dụng ứng dụng lập kế hoạch của chúng tôi, bạn đồng ý tuân thủ và bị ràng buộc bởi các điều khoản và điều kiện sau đây. Nếu bạn không đồng ý với bất kỳ phần nào của các điều khoản này, vui lòng không sử dụng dịch vụ của chúng tôi.
                </p>
              </section>
              <section className="mb-10">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-indigo-50 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3 font-bold">
                    2
                  </span>
                  Tài khoản Người dùng
                </h2>
                <p className="mb-4 leading-relaxed">
                  Để sử dụng đầy đủ các tính năng lập kế hoạch và theo dõi mục tiêu, bạn cần đăng ký một tài khoản.
                </p>
                <ul className="list-disc pl-5 space-y-2 ml-11">
                  <li>Bạn chịu trách nhiệm duy trì tính bảo mật của tài khoản và mật khẩu của mình.</li>
                  <li>Bạn phải cung cấp thông tin chính xác và đầy đủ khi đăng ký.</li>
                  <li>Bạn chịu trách nhiệm cho tất cả các hoạt động diễn ra dưới tài khoản của mình.</li>
                  <li>Chúng tôi có quyền đình chỉ hoặc chấm dứt tài khoản của bạn nếu phát hiện vi phạm điều khoản.</li>
                </ul>
              </section>
              <section className="mb-10">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-indigo-50 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3 font-bold">
                    3
                  </span>
                  Quyền Sở hữu Trí tuệ
                </h2>
                <p className="mb-4 leading-relaxed">
                  Nội dung, tính năng và chức năng của Dịch vụ (bao gồm nhưng không giới hạn ở tất cả thông tin, phần mềm, văn bản, màn hình hiển thị, hình ảnh, video và âm thanh) đều thuộc sở hữu của PlanDaily.
                </p>
                <p className="mb-4 leading-relaxed">
                  Dữ liệu cá nhân, kế hoạch và mục tiêu bạn nhập vào ứng dụng thuộc về bạn. Chúng tôi không yêu cầu quyền sở hữu đối với nội dung bạn tạo ra.
                </p>
              </section>
              <section className="mb-10">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-indigo-50 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3 font-bold">
                    4
                  </span>
                  Sử dụng Dịch vụ
                </h2>
                <p className="mb-4 leading-relaxed">
                  Bạn đồng ý không sử dụng Dịch vụ cho bất kỳ mục đích nào bất hợp pháp hoặc bị cấm bởi các Điều khoản này. Cụ thể, bạn đồng ý không:
                </p>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 ml-11">
                  <div className="flex items-start mb-3">
                    <span className="material-symbols-outlined text-red-400 mr-2 text-lg mt-0.5">block</span>
                    <span>Sử dụng dịch vụ để quấy rối, lạm dụng hoặc làm hại người khác.</span>
                  </div>
                  <div className="flex items-start mb-3">
                    <span className="material-symbols-outlined text-red-400 mr-2 text-lg mt-0.5">block</span>
                    <span>Cố gắng can thiệp hoặc làm gián đoạn tính toàn vẹn hoặc hiệu suất của Dịch vụ.</span>
                  </div>
                  <div className="flex items-start">
                    <span className="material-symbols-outlined text-red-400 mr-2 text-lg mt-0.5">block</span>
                    <span>Sao chép, bán lại hoặc khai thác bất kỳ phần nào của Dịch vụ mà không có sự cho phép bằng văn bản.</span>
                  </div>
                </div>
              </section>
              <section className="mb-10">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-indigo-50 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3 font-bold">
                    5
                  </span>
                  Thanh toán và Đăng ký
                </h2>
                <p className="mb-4 leading-relaxed">
                  Một số tính năng nâng cao của Dịch vụ có thể yêu cầu thanh toán phí. Nếu bạn chọn đăng ký gói trả phí:
                </p>
                <ul className="list-disc pl-5 space-y-2 ml-11">
                  <li>Phí sẽ được tính trước theo chu kỳ thanh toán đã chọn (hàng tháng hoặc hàng năm).</li>
                  <li>Gói đăng ký sẽ tự động gia hạn trừ khi bạn hủy trước khi kết thúc chu kỳ hiện tại.</li>
                  <li>Chúng tôi có thể thay đổi giá dịch vụ, nhưng sẽ thông báo trước cho bạn một khoảng thời gian hợp lý.</li>
                </ul>
              </section>
              <section className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-indigo-50 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3 font-bold">
                    6
                  </span>
                  Thay đổi Điều khoản
                </h2>
                <p className="mb-4 leading-relaxed">
                  Chúng tôi bảo lưu quyền sửa đổi hoặc thay thế các Điều khoản này bất cứ lúc nào. Nếu bản sửa đổi là quan trọng, chúng tôi sẽ cố gắng thông báo ít nhất 30 ngày trước khi bất kỳ điều khoản mới nào có hiệu lực.
                </p>
              </section>
            </div>
            <div className="mt-12 pt-8 border-t border-gray-100">
              <p className="text-center text-gray-500 mb-6">Bạn vẫn còn câu hỏi?</p>
              <div className="flex justify-center space-x-4">
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                >
                  <span className="material-symbols-outlined mr-2">mail</span>
                  Liên hệ hỗ trợ
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center px-6 py-3 border border-gray-200 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <span className="material-symbols-outlined mr-2">help</span>
                  Trung tâm trợ giúp
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <TermsFooter />
    </div>
  );
};

export default TermsPage;

