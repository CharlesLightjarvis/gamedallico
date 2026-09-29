import { useState } from "react";

type BuzzerProps = {
    locked?: boolean;
    disabled?: boolean;
    onBuzz?: () => void;
    className?: string;
    label?: string;
};

export function Buzzer({
    locked = false,
    disabled = locked,
    onBuzz,
    className = "",
    label,
}: BuzzerProps) {
    const [pressed, setPressed] = useState(false);

    const pressBuzzer = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (disabled || pressed) {
            return;
        }

        event.currentTarget.setPointerCapture(event.pointerId);
        setPressed(true);

        if ("vibrate" in navigator) {
            navigator.vibrate?.(25);
        }

        onBuzz?.();
    };

    const releaseBuzzer = (event?: React.PointerEvent<HTMLButtonElement>) => {
        if (
            event &&
            event.currentTarget.hasPointerCapture(event.pointerId)
        ) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        setPressed(false);
    };

    return (
        <button
            type="button"
            aria-label="Buzz"
            aria-disabled={disabled}
            tabIndex={disabled ? -1 : 0}
            onPointerDown={pressBuzzer}
            onPointerUp={releaseBuzzer}
            onPointerCancel={releaseBuzzer}
            onPointerLeave={releaseBuzzer}
            className={[
                "relative inline-grid size-[240px] select-none place-items-center",
                "border-0 bg-transparent p-0",
                "[-webkit-tap-highlight-color:transparent]",
                "focus-visible:outline-none",
                "focus-visible:ring-2",
                "focus-visible:ring-white",
                "focus-visible:ring-offset-8",
                "focus-visible:ring-offset-transparent",
                locked
                    ? "cursor-not-allowed opacity-[0.55] saturate-[0.25]"
                    : "cursor-pointer",
                className,
            ].join(" ")}
        >
            {/* GLOW */}
            <span
                className={[
                    "pointer-events-none absolute inset-[38px]",
                    "rounded-full bg-[#ff3131]",
                    "blur-[36px]",
                    "transition-all duration-200",
                    locked ? "opacity-[0.08]" : "opacity-[0.38]",
                ].join(" ")}
            />

            {/* SHADOW */}
            <span
                className="
                    pointer-events-none
                    absolute
                    bottom-[14px]
                    h-[62px]
                    w-[158px]
                    rounded-[50%]
                    bg-black/65
                    blur-[18px]
                "
            />

            {/* OUTER METAL RING */}
            <span
                className="
                    pointer-events-none
                    absolute
                    inset-[19px]
                    rounded-full
                    bg-[linear-gradient(145deg,#f2f2f3_0%,#858a92_20%,#3b3e45_56%,#111216_100%)]
                    shadow-[0_26px_45px_rgba(0,0,0,0.55),inset_0_2px_2px_rgba(255,255,255,0.65),inset_0_-5px_8px_rgba(0,0,0,0.65)]
                "
            />

            {/* DARK SOCKET */}
            <span
                className="
                    pointer-events-none
                    absolute
                    inset-[34px]
                    rounded-full
                    bg-[linear-gradient(180deg,#101116_0%,#262831_45%,#08090c_100%)]
                    shadow-[inset_0_9px_16px_rgba(0,0,0,0.95),inset_0_-2px_5px_rgba(255,255,255,0.07)]
                "
            />

            {/* BUTTON CAP */}
            <span
                className={[
                    "pointer-events-none",
                    "absolute inset-[48px]",
                    "grid place-items-center",
                    "rounded-full",
                    "bg-[radial-gradient(circle_at_36%_23%,rgba(255,255,255,0.55),transparent_21%),linear-gradient(180deg,#ff5a5a_0%,#ec2020_48%,#a20808_100%)]",
                    "transition-[transform,box-shadow]",
                    "ease-[cubic-bezier(0.2,0.8,0.2,1)]",

                    pressed
                        ? [
                              "duration-[45ms]",
                              "translate-y-[5px]",
                              "scale-[0.985]",
                              "shadow-[inset_0_7px_12px_rgba(70,0,0,0.38),inset_0_-3px_6px_rgba(255,255,255,0.12),0_2px_0_#6f0505]",
                          ].join(" ")
                        : [
                              "duration-150",
                              "-translate-y-[7px]",
                              "shadow-[inset_0_5px_7px_rgba(255,255,255,0.32),inset_0_-15px_22px_rgba(86,0,0,0.38),0_12px_0_#6f0505,0_18px_24px_rgba(0,0,0,0.52)]",
                          ].join(" "),
                ].join(" ")}
            >
                {/* SHINE */}
                <span
                    className="
                        absolute
                        left-[31px]
                        top-[24px]
                        h-[18px]
                        w-[62px]
                        -rotate-[15deg]
                        rounded-full
                        bg-white/[0.28]
                        blur-[1px]
                    "
                />

                {/* LABEL */}
                <span
                    className="
                        relative
                        z-10
                        text-[23px]
                        font-black
                        tracking-[0.12em]
                        text-white
                        [text-shadow:0_3px_3px_rgba(0,0,0,0.45)]
                    "
                >
                    {label ?? (locked ? "LOCKED" : "BUZZ")}
                </span>
            </span>
        </button>
    );
}

export default Buzzer;
