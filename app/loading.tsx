import { Spinner } from "@/shared/ui";

export default function Loading() {
    return (
        <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
            <Spinner size="lg" />
        </div>
    );
}
