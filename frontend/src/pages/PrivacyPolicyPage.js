import React from 'react';
import { Link } from 'react-router-dom';
import PrivacyPolicyHeader from '../components/PrivacyPolicyHeader';
import PrivacyPolicyFooter from '../components/PrivacyPolicyFooter';

const PrivacyPolicyPage = () => {
  return (
    <div className="antialiased min-h-screen flex flex-col bg-slate-50">
      <PrivacyPolicyHeader />
      <main className="flex-grow py-12 md:py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-8">
            <Link to="/" className="hover:text-blue-600 transition-colors">
              Trang chủ
            </Link>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-slate-900 font-medium">Chính sách bảo mật</span>
          </div>
          <div className="mb-12 border-b border-slate-200 pb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
              Chính sách Bảo mật
            </h1>
            <p className="text-lg text-slate-600">Cập nhật lần cuối: 15 Tháng 10, 2023</p>
            <p className="mt-4 text-slate-600">
              Chúng tôi coi trọng sự riêng tư của bạn. Tài liệu này phác thảo cách chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn khi bạn sử dụng dịch vụ lập kế hoạch hàng ngày của chúng tôi.
            </p>
          </div>
          <article className="prose prose-lg max-w-none text-slate-700">
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">1. Thu thập thông tin</h2>
            <p className="mb-4 leading-relaxed">
              Chúng tôi chỉ thu thập những thông tin cần thiết để cung cấp dịch vụ tốt nhất cho bạn. Các loại thông tin chúng tôi có thể thu thập bao gồm:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-6">
              <li>
                <strong>Thông tin tài khoản:</strong> Tên, địa chỉ email, và mật khẩu khi bạn đăng ký tài khoản.
              </li>
              <li>
                <strong>Dữ liệu kế hoạch:</strong> Các mục tiêu, danh sách việc cần làm, ghi chú và lịch trình bạn nhập vào ứng dụng.
              </li>
              <li>
                <strong>Thông tin thiết bị:</strong> Loại thiết bị, hệ điều hành và thông tin trình duyệt để tối ưu hóa trải nghiệm người dùng.
              </li>
            </ul>

            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">2. Sử dụng thông tin</h2>
            <p className="mb-4 leading-relaxed">Thông tin của bạn được sử dụng cho các mục đích sau:</p>
            <ul className="list-disc pl-6 space-y-2 mb-6">
              <li>Cung cấp, vận hành và duy trì ứng dụng DailyPlan.</li>
              <li>Cải thiện, cá nhân hóa và mở rộng các tính năng của dịch vụ.</li>
              <li>Phân tích cách bạn sử dụng ứng dụng để cải thiện giao diện và trải nghiệm.</li>
              <li>Gửi email thông báo, nhắc nhở hoặc cập nhật quan trọng liên quan đến tài khoản của bạn.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">3. Bảo mật dữ liệu</h2>
            <p className="mb-4 leading-relaxed">
              Bảo mật dữ liệu của bạn là ưu tiên hàng đầu của chúng tôi. Chúng tôi sử dụng các biện pháp kỹ thuật và tổ chức phù hợp để bảo vệ thông tin cá nhân của bạn khỏi mất mát, trộm cắp, truy cập trái phép, tiết lộ, sao chép, sử dụng hoặc sửa đổi.
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-6 rounded-r-lg">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-blue-600">security</span>
                <div>
                  <p className="font-medium text-blue-900 mb-1">Mã hóa đầu cuối</p>
                  <p className="text-sm text-blue-800 m-0">
                    Dữ liệu nhạy cảm của bạn được mã hóa trong quá trình truyền tải và lưu trữ để đảm bảo an toàn tuyệt đối.
                  </p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">4. Chia sẻ thông tin với bên thứ ba</h2>
            <p className="mb-4 leading-relaxed">
              Chúng tôi cam kết không bán, trao đổi hoặc chuyển giao thông tin nhận dạng cá nhân của bạn cho bên ngoài. Điều này không bao gồm các bên thứ ba đáng tin cậy hỗ trợ chúng tôi vận hành trang web, tiến hành kinh doanh hoặc phục vụ bạn, miễn là các bên này đồng ý giữ bí mật thông tin này.
            </p>

            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">5. Quyền của người dùng</h2>
            <p className="mb-4 leading-relaxed">
              Bạn có quyền truy cập, sửa đổi hoặc xóa thông tin cá nhân của mình bất kỳ lúc nào thông qua cài đặt tài khoản. Nếu bạn muốn xóa hoàn toàn dữ liệu của mình khỏi hệ thống của chúng tôi, vui lòng liên hệ với bộ phận hỗ trợ.
            </p>

            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">6. Cookie</h2>
            <p className="mb-4 leading-relaxed">
              Trang web của chúng tôi sử dụng "cookie" để nâng cao trải nghiệm của bạn. Bạn có thể chọn tắt cookie thông qua cài đặt trình duyệt của mình, nhưng điều này có thể ảnh hưởng đến khả năng hoạt động của một số tính năng trên trang web.
            </p>

            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">7. Thay đổi chính sách</h2>
            <p className="mb-4 leading-relaxed">
              Chúng tôi có thể cập nhật Chính sách bảo mật này theo thời gian. Chúng tôi sẽ thông báo cho bạn về bất kỳ thay đổi nào bằng cách đăng Chính sách bảo mật mới trên trang này. Bạn nên xem lại Chính sách bảo mật này định kỳ để biết mọi thay đổi.
            </p>

            <div className="mt-12 pt-8 border-t border-slate-200">
              <p className="font-medium text-slate-900 mb-2">Bạn vẫn còn câu hỏi?</p>
              <p className="mb-4">Nếu bạn có bất kỳ câu hỏi nào về Chính sách bảo mật này, vui lòng liên hệ với chúng tôi:</p>
              <a
                className="inline-flex items-center gap-2 text-blue-600 font-medium hover:underline"
                href="mailto:support@dailyplan.com"
              >
                <span className="material-symbols-outlined text-sm">mail</span>
                support@dailyplan.com
              </a>
            </div>
          </article>
        </div>
      </main>
      <PrivacyPolicyFooter />
    </div>
  );
};

export default PrivacyPolicyPage;

