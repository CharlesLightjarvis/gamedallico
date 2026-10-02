import { expect, test } from "bun:test";

const css = await Bun.file("resources/css/app.css").text();

test("prominent feedback finishes visible for its full server phase", () => {
    expect(css).toContain(
        ".game-action-feedback--prominent .game-action-feedback__copy {\n    animation-name: buzz-action-copy-hold;\n    animation-duration: 1s;",
    );
    expect(css).toMatch(
        /@keyframes buzz-action-copy-hold[\s\S]*?to \{[\s\S]*?opacity: 1;/,
    );
});
