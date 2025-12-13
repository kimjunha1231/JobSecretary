
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: '이용약관 | JobSecretary',
    description: 'JobSecretary 서비스 이용약관입니다. 서비스 이용에 관한 권리와 의무를 안내합니다.',
};

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-300 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Navigation */}


                {/* Header */}
                <h1 className="text-3xl font-bold text-neutral-100 mb-2">이용약관</h1>
                <p className="text-sm text-neutral-500 mb-8">최종 수정일: 2025년 11월 28일</p>

                {/* Content */}
                <div className="space-y-8 leading-relaxed text-sm">
                    {/* 제1조 */}
                    <section>
                        <h2 className="text-2xl font-bold text-neutral-200 mb-4">제1조 (목적)</h2>
                        <p>
                            본 약관은 JobSecretary(이하 "서비스")가 제공하는 자기소개서 및 이력서 관리 서비스의 이용과 관련하여
                            회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
                        </p>
                    </section>

                    {/* 제2조 */}
                    <section>
                        <h2 className="text-2xl font-bold text-neutral-200 mb-4">제2조 (서비스의 목적 및 범위)</h2>
                        <div className="space-y-3">
                            <p>① 본 서비스는 이용자가 작성한 자기소개서, 이력서 등의 문서를 안전하게 보관하고 관리할 수 있도록 돕는 데이터 저장 및 관리 도구입니다.</p>
                            <p>② 본 서비스는 AI 기반 첨삭 기능을 제공하나, 이는 참고용 제안일 뿐이며 취업 합격을 보장하지 않습니다.</p>
                            <p>③ 회사는 서비스 제공 과정에서 발생하는 취업 결과, 합격 여부, 기타 채용 관련 결과에 대해 어떠한 책임도 지지 않습니다.</p>
                        </div>
                    </section>

                    {/* 제3조 */}
                    <section>
                        <h2 className="text-2xl font-bold text-neutral-200 mb-4">제3조 (저작권 및 콘텐츠 소유권)</h2>
                        <div className="space-y-3">
                            <p>① 이용자가 본 서비스를 통해 작성, 업로드, 저장한 모든 자기소개서, 이력서 및 기타 콘텐츠의 저작권은 전적으로 <strong className="text-neutral-100">이용자 본인</strong>에게 귀속됩니다.</p>
                            <p>② 회사는 이용자의 콘텐츠에 대한 소유권을 주장하지 않으며, 서비스 제공 목적 외에 이용자의 명시적 동의 없이 해당 콘텐츠를 사용, 복제, 배포하지 않습니다.</p>
                            <p>③ 이용자는 본인이 작성한 콘텐츠에 대한 모든 법적 책임을 부담하며, 제3자의 권리를 침해하지 않을 책임이 있습니다.</p>
                        </div>
                    </section>

                    {/* 제4조 */}
                    <section>
                        <h2 className="text-2xl font-bold text-neutral-200 mb-4">제4조 (AI 기능 및 데이터 처리)</h2>
                        <div className="space-y-3">
                            <p>① 본 서비스는 AI 기반 첨삭 기능을 제공하며, 해당 기능 사용 시 이용자의 문서 내용이 외부 AI 모델(Gemini API 등)로 일시적으로 전송될 수 있습니다.</p>
                            <p>② 회사는 AI 기능 사용 과정에서 전송되는 데이터가 <strong className="text-neutral-100">모델 학습에 사용되지 않도록</strong> 기술적 조치를 취합니다.</p>
                            <p>③ AI가 제공하는 첨삭 결과는 참고용이며, 그 정확성이나 적합성에 대해 회사는 보증하지 않습니다.</p>
                        </div>
                    </section>

                    {/* 제5조 */}
                    <section>
                        <h2 className="text-2xl font-bold text-neutral-200 mb-4">제5조 (서비스 이용 및 제한)</h2>
                        <div className="space-y-3">
                            <p>① 이용자는 Google 계정을 통한 로그인으로 본 서비스를 이용할 수 있습니다.</p>
                            <p>② 회사는 다음 각 호에 해당하는 경우 서비스 이용을 제한하거나 중단할 수 있습니다:</p>
                            <ul className="list-disc list-inside ml-4 space-y-1 text-neutral-400">
                                <li>타인의 정보를 도용하거나 허위 정보를 제공한 경우</li>
                                <li>서비스의 안정적 운영을 방해하는 행위를 한 경우</li>
                                <li>법령 또는 본 약관을 위반한 경우</li>
                                <li>기타 회사가 서비스 제공이 부적절하다고 판단한 경우</li>
                            </ul>
                        </div>
                    </section>

                    {/* 제6조 */}
                    <section>
                        <h2 className="text-2xl font-bold text-neutral-200 mb-4">제6조 (면책 및 책임의 제한)</h2>
                        <div className="space-y-3">
                            <p>① 회사는 천재지변, 전쟁, 테러, 해킹, DDoS 공격, 시스템 장애 등 불가항력적 사유로 인한 서비스 중단 또는 데이터 유실에 대해 책임을 지지 않습니다.</p>
                            <p>② 회사는 이용자의 귀책사유로 인한 서비스 이용 장애 또는 데이터 손실에 대해 책임을 지지 않습니다.</p>
                            <p>③ 회사는 이용자가 서비스를 통해 얻은 정보 또는 자료의 신뢰도, 정확성에 대해 보증하지 않으며, 이로 인한 손해에 대해 책임을 지지 않습니다.</p>
                            <p>④ 회사는 이용자 간 또는 이용자와 제3자 간에 발생한 분쟁에 대해 개입할 의무가 없으며, 이로 인한 손해를 배상할 책임이 없습니다.</p>
                        </div>
                    </section>

                    {/* 제7조 */}
                    <section>
                        <h2 className="text-2xl font-bold text-neutral-200 mb-4">제7조 (데이터 백업 및 보안)</h2>
                        <div className="space-y-3">
                            <p>① 회사는 이용자의 데이터를 안전하게 보관하기 위해 합리적인 수준의 보안 조치를 취합니다.</p>
                            <p>② 그러나 회사는 기술적 결함, 외부 공격 등으로 인한 데이터 유실 또는 손상에 대해 완전한 책임을 지지 않습니다.</p>
                            <p>③ 이용자는 중요한 데이터에 대해 별도의 백업을 수행할 것을 권장합니다.</p>
                        </div>
                    </section>

                    {/* 제8조 */}
                    <section>
                        <h2 className="text-2xl font-bold text-neutral-200 mb-4">제8조 (회원 탈퇴 및 데이터 삭제)</h2>
                        <div className="space-y-3">
                            <p>① 이용자는 언제든지 회원 탈퇴를 요청할 수 있습니다.</p>
                            <p>② 회원 탈퇴 시 이용자의 모든 개인정보 및 저장된 문서는 즉시 영구 삭제되며, 복구할 수 없습니다.</p>
                            <p>③ 단, 관련 법령에 따라 보관이 필요한 정보는 법정 기간 동안 보관될 수 있습니다.</p>
                        </div>
                    </section>

                    {/* 제9조 */}
                    <section>
                        <h2 className="text-2xl font-bold text-neutral-200 mb-4">제9조 (약관의 변경)</h2>
                        <div className="space-y-3">
                            <p>① 회사는 필요한 경우 본 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지 또는 이메일을 통해 고지합니다.</p>
                            <p>② 변경된 약관은 공지 후 7일이 경과한 시점부터 효력이 발생합니다.</p>
                            <p>③ 이용자가 변경된 약관에 동의하지 않을 경우, 서비스 이용을 중단하고 회원 탈퇴를 요청할 수 있습니다.</p>
                        </div>
                    </section>

                    {/* 제10조 */}
                    <section>
                        <h2 className="text-2xl font-bold text-neutral-200 mb-4">제10조 (준거법 및 관할법원)</h2>
                        <div className="space-y-3">
                            <p>① 본 약관의 해석 및 적용은 대한민국 법령을 따릅니다.</p>
                            <p>② 서비스 이용과 관련하여 발생한 분쟁에 대해서는 회사의 본사 소재지를 관할하는 법원을 전속 관할법원으로 합니다.</p>
                        </div>
                    </section>

                    {/* Footer */}
                    <section className="pt-8 border-t border-neutral-800">
                        <p className="text-neutral-500 text-xs">
                            본 약관은 2025년 11월 28일부터 시행됩니다.<br />
                            문의사항이 있으시면 서비스 내 고객센터를 통해 연락 주시기 바랍니다.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
