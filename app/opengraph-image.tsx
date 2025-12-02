import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'JobSecretary - AI 통합 채용 관리 플랫폼';
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(to bottom right, #000000, #1a1a1a)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'sans-serif',
                    color: 'white',
                    padding: '40px',
                    position: 'relative',
                }}
            >
                {/* Background Pattern */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: 'radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.1) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(255, 255, 255, 0.1) 2%, transparent 0%)',
                        backgroundSize: '100px 100px',
                        opacity: 0.5,
                    }}
                />

                {/* Logo/Icon Area */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '40px',
                        background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
                        borderRadius: '24px',
                        width: '120px',
                        height: '120px',
                        boxShadow: '0 20px 50px rgba(59, 130, 246, 0.5)',
                    }}
                >
                    <svg
                        width="64"
                        height="64"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
                    </svg>
                </div>

                {/* Title */}
                <div
                    style={{
                        fontSize: '72px',
                        fontWeight: 'bold',
                        marginBottom: '20px',
                        textAlign: 'center',
                        background: 'linear-gradient(to right, #fff, #ccc)',
                        backgroundClip: 'text',
                        color: 'transparent',
                        textShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    }}
                >
                    JobSecretary
                </div>

                {/* Subtitle */}
                <div
                    style={{
                        fontSize: '32px',
                        color: '#a1a1aa',
                        textAlign: 'center',
                        maxWidth: '800px',
                        lineHeight: 1.5,
                    }}
                >
                    AI 통합 채용 관리 플랫폼
                    <br />
                    자기소개서 관리부터 면접 준비까지
                </div>

                {/* Tagline */}
                <div
                    style={{
                        marginTop: '60px',
                        display: 'flex',
                        gap: '20px',
                    }}
                >
                    <div style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.1)', borderRadius: '50px', fontSize: '20px' }}>AI 자기소개서</div>
                    <div style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.1)', borderRadius: '50px', fontSize: '20px' }}>AI 면접 준비</div>
                    <div style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.1)', borderRadius: '50px', fontSize: '20px' }}>채용 공고 관리</div>
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
