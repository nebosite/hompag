import { expect } from "chai";
import { BuildStamp } from "../BuildStamp";
import { DevWorkspace, PackageName, PackageState } from "../DevWorkspace";

const stamp = (source: string, lock = "L") => ({ source, lock });
const built = (source: string, lock = "L"): PackageState =>
    ({ stamp: stamp(source, lock), previous: stamp(source, lock), hasNodeModules: true, hasOutput: true });

const states = (overrides: Partial<{ [pkg in PackageName]: PackageState }> = {}) => ({
    common: built("c1"), clientapp: built("a1"), webserver: built("w1"), ...overrides
});

const summary = (steps: ReturnType<typeof DevWorkspace.planBuild>) =>
    steps.map(s => `${s.pkg}:${s.install ? "i" : "-"}${s.build ? "b" : "-"}`).join(" ");

describe("DevWorkspace.planBuild", () => {
    it("does nothing when nothing changed", () => {
        expect(summary(DevWorkspace.planBuild(states()))).equal("common:-- clientapp:-- webserver:--");
    });

    it("rebuilds only the client when only client source changed", () => {
        const plan = DevWorkspace.planBuild(states({ clientapp: { ...built("a1"), stamp: stamp("a2") } }));
        expect(summary(plan)).equal("common:-- clientapp:-b webserver:--");
    });

    it("rebuilds common and the client when common changes", () => {
        const plan = DevWorkspace.planBuild(states({ common: { ...built("c1"), stamp: stamp("c2") } }));
        expect(summary(plan)).equal("common:-b clientapp:-b webserver:--");
    });

    it("reinstalls only when a lock file changes", () => {
        const plan = DevWorkspace.planBuild(states({ webserver: { ...built("w1"), stamp: stamp("w1", "L2") } }));
        expect(summary(plan)).equal("common:-- clientapp:-- webserver:i-");
    });

    it("builds everything on a fresh checkout", () => {
        const fresh = (s: string): PackageState => ({ stamp: stamp(s), hasNodeModules: false, hasOutput: false });
        const plan = DevWorkspace.planBuild({ common: fresh("c"), clientapp: fresh("a"), webserver: fresh("w") });
        expect(summary(plan)).equal("common:ib clientapp:ib webserver:i-");
    });

    it("adopts an existing checkout without reinstalling its dependencies", () => {
        const adopted = (s: string): PackageState => ({ stamp: stamp(s), hasNodeModules: true, hasOutput: true });
        const plan = DevWorkspace.planBuild({ common: adopted("c"), clientapp: adopted("a"), webserver: adopted("w") });
        expect(summary(plan)).equal("common:-b clientapp:-b webserver:--");
    });

    it("rebuilds when the output was deleted", () => {
        const plan = DevWorkspace.planBuild(states({ clientapp: { ...built("a1"), hasOutput: false } }));
        expect(summary(plan)).equal("common:-- clientapp:-b webserver:--");
    });

    it("does everything when forced", () => {
        expect(summary(DevWorkspace.planBuild(states(), true))).equal("common:ib clientapp:ib webserver:i-");
    });
});

describe("BuildStamp.pathFromStatusLine", () => {
    it("handles plain, renamed, and quoted paths", () => {
        expect(BuildStamp.pathFromStatusLine(" M clientapp/src/App.tsx")).equal("clientapp/src/App.tsx");
        expect(BuildStamp.pathFromStatusLine("R  common/a.ts -> common/b.ts")).equal("common/b.ts");
        expect(BuildStamp.pathFromStatusLine('?? "clientapp/my file.ts"')).equal("clientapp/my file.ts");
    });
});
