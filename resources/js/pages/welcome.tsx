import { Head, Link, usePage } from "@inertiajs/react";
import { dashboard, login } from "@/routes";
import { register } from "@/routes";
import Buzzer from "@/components/ui/games/buzzer";
import BuzzWortArena from "@/components/ui/games/buzz-wort-arena";

export default function Welcome() {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Welcome" />
            <div className="flex min-h-screen flex-col items-center bg-[#FDFDFC] p-6 text-[#1b1b18] lg:justify-center lg:p-8 dark:bg-[#0a0a0a]">
                <BuzzWortArena />
            </div>
        </>
    );
}
