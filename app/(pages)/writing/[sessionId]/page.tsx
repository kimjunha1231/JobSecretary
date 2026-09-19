import { WritingStudioBoard } from '@/widgets/writing-studio';

type PageProps = { params: Promise<{ sessionId: string }> };

export default async function WritingSessionPage({ params }: PageProps) {
    const { sessionId } = await params;
    return <WritingStudioBoard sessionId={sessionId} />;
}
