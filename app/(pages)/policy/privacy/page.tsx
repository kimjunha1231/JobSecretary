
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: '개인정보처리방침 | JobSecretary',
    description: 'JobSecretary 서비스의 개인정보처리방침입니다. 개인정보 수집, 이용, 보호에 관한 정책을 안내합니다.',
};

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-300 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Navigation */}


                {/* Header */}
                <h1 className="text-3xl font-bold text-neutral-100 mb-2">개인정보처리방침</h1>
                <p className="text-sm text-neutral-500 mb-8">최종 수정일: 2025년 11월 28일</p>

                {/* Content */}
                <div className="space-y-8 leading-relaxed text-sm">
                    {/* 제1조 */}
                    <section>
                        <h2 className="text-2xl font-bold text-neutral-200 mb-4">제1조 (개인정보의 처리 목적)</h2>
                        <p>
                            JobSecretary(이하 "회사")는 다음의 목적을 위하여 개인정보를 처리합니다.
                            처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며,
                            이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
                        </p>
                        <ul className="list-disc list-inside ml-4 mt-3 space-y-2 text-neutral-400">
                            <li>회원 가입 및 본인 확인</li>
                            <li>서비스 제공 및 이용자 식별</li>
                            <li>자기소개서 및 이력서 데이터 저장 및 관리</li>
                            <li>AI 기반 첨삭 서비스 제공</li>
                            <li>서비스 개선 및 통계 분석</li>
                            <li>고객 문의 응대 및 공지사항 전달</li>
                        </ul>
                    </section>

                    {/* 제2조 */}
                    <section>
                        <h2 className="text-2xl font-bold text-neutral-200 mb-4">제2조 (수집하는 개인정보의 항목)</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-neutral-300 mb-2">1. 필수 수집 항목 (Google 로그인 시)</h3>
                                <ul className="list-disc list-inside ml-4 space-y-1 text-neutral-400">
                                    <li>이메일 주소</li>
                                    <li>이름</li>
                                    <li>프로필 사진 (선택적)</li>
                                    <li>Google 계정 고유 식별자</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-neutral-300 mb-2">2. 서비스 이용 과정에서 수집되는 정보</h3>
                                <ul className="list-disc list-inside ml-4 space-y-1 text-neutral-400">
                                    <li>이용자가 직접 작성 및 입력한 자기소개서, 이력서 내용</li>
                                    <li>회사명, 직무명, 지원 URL 등 채용 관련 정보</li>
                                    <li>서비스 이용 기록, 접속 로그, IP 주소</li>
                                    <li>쿠키 및 세션 정보</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* 제3조 */}
                    <section>
                        <h2 className="text-2xl font-bold text-neutral-200 mb-4">제3조 (개인정보의 처리 및 보유 기간)</h2>
                        <div className="space-y-3">
                            <p>① 회사는 이용자의 개인정보를 <strong className="text-neutral-100">회원 가입일로부터 회원 탈퇴 시까지</strong> 보유 및 이용합니다.</p>
                            <p>② 이용자가 회원 탈퇴를 요청하는 경우, 모든 개인정보 및 저장된 문서는 <strong className="text-neutral-100">즉시 영구 삭제</strong>되며 복구할 수 없습니다.</p>
                            <p>③ 단, 관련 법령에 따라 보존할 필요가 있는 경우 아래와 같이 일정 기간 보관합니다:</p>
                            <ul className="list-disc list-inside ml-4 space-y-1 text-neutral-400">
                                <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
                                <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</li>
                                <li>소비자 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)</li>
                                <li>접속 로그 기록: 3개월 (통신비밀보호법)</li>
                            </ul>
                        </div>
                    </section>

                    {/* 제4조 */}
                    <section>
                        <h2 className="text-2xl font-bold text-neutral-200 mb-4">제4조 (개인정보의 제3자 제공)</h2>
                        <div className="space-y-3">
                            <p>① 회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.</p>
                            <p>② 다만, 다음의 경우에는 예외로 합니다:</p>
                            <ul className="list-disc list-inside ml-4 space-y-1 text-neutral-400">
                                <li>이용자가 사전에 동의한 경우</li>
                                <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
                            </ul>
                            <p>③ <strong className="text-neutral-100">AI 첨삭 기능 사용 시</strong> 이용자의 문서 내용이 외부 AI 서비스 제공자(Gemini API 등)로 일시적으로 전송됩니다.
                                단, 해당 데이터는 <strong className="text-neutral-100">모델 학습에 사용되지 않으며</strong>, 첨삭 결과 생성 목적으로만 처리됩니다.</p>
                        </div>
                    </section>

                    {/* 제5조 */}
                    <section>
                        <h2 className="text-2xl font-bold text-neutral-200 mb-4">제5조 (개인정보 처리의 위탁)</h2>
                        <div className="space-y-3">
                            <p>회사는 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다:</p>
                            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 mt-3">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-neutral-800">
                                            <th className="text-left py-2 text-neutral-300">수탁업체</th>
                                            <th className="text-left py-2 text-neutral-300">위탁 업무 내용</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-neutral-800">
                                            <td className="py-2 text-neutral-400">Google LLC</td>
                                            <td className="py-2 text-neutral-400">소셜 로그인 인증</td>
                                        </tr>
                                        <tr className="border-b border-neutral-800">
                                            <td className="py-2 text-neutral-400">Supabase Inc.</td>
                                            <td className="py-2 text-neutral-400">데이터베이스 호스팅 및 관리</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 text-neutral-400">Google AI (Gemini)</td>
                                            <td className="py-2 text-neutral-400">AI 첨삭 서비스 제공</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    {/* 제6조 */}
                    <section>
                        <h2 className="text-2xl font-bold text-neutral-200 mb-4">제6조 (이용자의 권리와 행사 방법)</h2>
                        <div className="space-y-3">
                            <p>① 이용자는 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:</p>
                            <ul className="list-disc list-inside ml-4 space-y-1 text-neutral-400">
                                <li>개인정보 열람 요구</li>
                                <li>개인정보 정정 요구</li>
                                <li>개인정보 삭제 요구</li>
                                <li>개인정보 처리 정지 요구</li>
                            </ul>
                            <p>② 상기 권리 행사는 서비스 내 설정 메뉴 또는 고객센터를 통해 요청할 수 있습니다.</p>
                            <p>③ 회원 탈퇴 시 모든 개인정보는 즉시 삭제되며, 복구가 불가능합니다.</p>
                        </div>
                    </section>

                    {/* 제7조 */}
                    <section>
                        <h2 className="text-2xl font-bold text-neutral-200 mb-4">제7조 (개인정보의 파기)</h2>
                        <div className="space-y-3">
                            <p>① 회사는 개인정보 보유 기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.</p>
                            <p>② 개인정보 파기 절차 및 방법은 다음과 같습니다:</p>
                            <ul className="list-disc list-inside ml-4 space-y-1 text-neutral-400">
                                <li><strong className="text-neutral-300">파기 절차:</strong> 이용자의 개인정보는 목적 달성 후 별도의 DB로 옮겨져 내부 방침 및 관련 법령에 따라 일정 기간 저장된 후 파기됩니다.</li>
                                <li><strong className="text-neutral-300">파기 방법:</strong> 전자적 파일 형태의 정보는 복구 불가능한 방법으로 영구 삭제하며, 종이 문서는 분쇄기로 분쇄하거나 소각합니다.</li>
                            </ul>
                        </div>
                    </section>

                    {/* 제8조 */}
                    <section>
                        <h2 className="text-2xl font-bold text-neutral-200 mb-4">제8조 (개인정보의 안전성 확보 조치)</h2>
                        <div className="space-y-3">
                            <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:</p>
                            <ul className="list-disc list-inside ml-4 space-y-1 text-neutral-400">
                                <li>개인정보 취급 직원의 최소화 및 교육</li>
                                <li>개인정보에 대한 접근 제한 및 권한 관리</li>
                                <li>암호화 통신(HTTPS) 적용</li>
                                <li>데이터베이스 접근 통제 및 로그 관리</li>
                                <li>보안 프로그램 설치 및 주기적 업데이트</li>
                            </ul>
                        </div>
                    </section>

                    {/* 제9조 */}
                    <section>
                        <h2 className="text-2xl font-bold text-neutral-200 mb-4">제9조 (쿠키의 운용)</h2>
                        <div className="space-y-3">
                            <p>① 회사는 이용자에게 개인화된 서비스를 제공하기 위해 쿠키(Cookie)를 사용합니다.</p>
                            <p>② 쿠키는 웹사이트 운영에 이용되는 서버가 이용자의 브라우저에 보내는 소량의 정보이며, 이용자의 컴퓨터에 저장됩니다.</p>
                            <p>③ 이용자는 쿠키 설치에 대한 선택권을 가지고 있으며, 웹 브라우저 설정을 통해 쿠키를 거부할 수 있습니다.
                                단, 쿠키 저장을 거부할 경우 일부 서비스 이용에 제한이 있을 수 있습니다.</p>
                        </div>
                    </section>

                    {/* 제10조 */}
                    <section>
                        <h2 className="text-2xl font-bold text-neutral-200 mb-4">제10조 (개인정보 보호책임자)</h2>
                        <div className="space-y-3">
                            <p>① 회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다:</p>
                            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 mt-3">
                                <p className="text-neutral-400">
                                    <strong className="text-neutral-300">개인정보 보호책임자</strong><br />
                                    담당 부서: 운영팀<br />
                                    연락처: 서비스 내 고객센터
                                </p>
                            </div>
                            <p>② 이용자는 서비스를 이용하면서 발생한 모든 개인정보 보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자에게 문의할 수 있습니다.</p>
                        </div>
                    </section>

                    {/* 제11조 */}
                    <section>
                        <h2 className="text-2xl font-bold text-neutral-200 mb-4">제11조 (개인정보처리방침의 변경)</h2>
                        <div className="space-y-3">
                            <p>① 본 개인정보처리방침은 법령, 정책 또는 보안기술의 변경에 따라 내용의 추가, 삭제 및 수정이 있을 시에는 변경사항 시행 7일 전부터 서비스 내 공지사항을 통해 고지할 것입니다.</p>
                            <p>② 다만, 이용자 권리의 중요한 변경이 있을 경우에는 최소 30일 전에 고지합니다.</p>
                        </div>
                    </section>

                    {/* Footer */}
                    <section className="pt-8 border-t border-neutral-800">
                        <p className="text-neutral-500 text-xs">
                            본 개인정보처리방침은 2025년 11월 28일부터 시행됩니다.<br />
                            이전 개인정보처리방침은 서비스 내에서 확인하실 수 있습니다.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
