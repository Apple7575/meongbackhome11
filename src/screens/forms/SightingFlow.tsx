import { useState } from "react";
import { useStore } from "../../app/useStore.ts";
import { commit } from "../../app/actions.ts";
import { read, id as newId } from "../../client-store.js";
import { toast } from "../../app/toast.ts";
import { COORDS, nearestRegion } from "../../domain.js";
import { objectParticle } from "../../format.ts";
import Flow from "./Flow.tsx";
import { TextField, Options, BigOptions, PhotoPicker, WhenField, WhereField, DirectionField, whenLabel, toLocalInput } from "./fields.tsx";
import { useDraft } from "./useDraft.ts";
import s from "./forms.module.css";
import type { ReactNode } from "react";
import type { Coords, Dog, Report } from "../../types.ts";
import type { DirectionMode } from "./fields.tsx";
import { errorText } from "../../errors.ts";
interface SightingValues {
  kind: string; region: string; time: string; location: string; directionMode: DirectionMode;
  color: string; size: string; description: string;
}
interface SightingExtra { coords: Coords; picked: boolean; heading: number | null }
interface Step { title: string; description: string; body: ReactNode; check?: () => string | undefined }
export default function SightingFlow({ dogId }: { dogId?: string }) {
  const db = useStore();
  const dog = dogId ? db.dogs.find((d) => d.id === dogId) : null;
  return <SightingForm key={dogId || "new"} dog={dog} dogId={dogId} />;
}
function SightingForm({ dog, dogId }: { dog?: Dog | null; dogId?: string }) {
  const key = `sighting-${dogId || "new"}`;
  const draft = useDraft<SightingValues, SightingExtra>(key, {
    values: { kind: "목격", region: dog?.region || "서울", time: toLocalInput(), location: "", directionMode: "unknown", color: "모름", size: "모름", description: "" },
    image: "",
    extra: { coords: dog?.coords || COORDS.서울, picked: false, heading: null },
  });
  const { values: v, image, extra } = draft;
  const set = (values: Partial<SightingValues>) => draft.update({ values });
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const heading = extra.heading ?? 0;
  const steps: Step[] = [
    {
      title: dog ? `${dog.name}${objectParticle(dog.name)} 본 곳은 어디인가요?` : "강아지를 본 곳은 어디인가요?",
      description: "내 위치가 아니라 강아지를 본 지점을 골라주세요.",
      body: (
        <WhereField mapId="sighting-picker" region={v.region} location={v.location} placeholder="예: 석촌호수 동호 북쪽 산책로 벤치 앞"
          coords={extra.coords} heading={v.directionMode === "moving" ? heading : null} picked={extra.picked} onMessage={toast}
          onRegion={(region) => extra.picked ? set({ region }) : draft.update({ values: { region }, extra: { coords: COORDS[region], picked: false } })}
          onLocation={(location) => set({ location })}
          onPick={(coords) => draft.update({ values: { region: nearestRegion(coords) }, extra: { coords, picked: true } })} />
      ),
      check: () => (!v.location.trim() ? "장소를 적어주세요." : !extra.picked ? "지도를 움직여 강아지를 본 곳에 핀을 맞춰주세요." : undefined),
    },
    {
      title: "언제, 어떤 상황이었나요?",
      description: "대략적인 시간도 괜찮아요.",
      body: (<>
        <BigOptions label="상황" value={v.kind} onChange={(kind) => set({ kind })}
          options={[["목격", "지나가는 걸 봤어요"], ["보호 중", "지금 데리고 있어요", "정확한 위치는 보호자에게만 보여요"], ["기관 인계", "보호소·경찰에 맡겼어요"]]} />
        <WhenField label="본 시간" value={v.time} onChange={(time) => set({ time })} />
      </>),
      check: () => (!v.time ? "시간을 골라주세요." : new Date(v.time) > new Date() ? "지금보다 미래일 수는 없어요." : undefined),
    },
    {
      title: "어느 쪽으로 갔나요?",
      description: "모르면 넘어가도 돼요.",
      body: (
        <DirectionField mode={v.directionMode} heading={heading}
          onMode={(directionMode) => draft.update({ values: { directionMode }, extra: { heading: directionMode === "moving" ? heading : null } })}
          onHeading={(h) => draft.update({ extra: { heading: h } })} />
      ),
    },
    {
      title: "사진이나 특징이 있으면 알려주세요",
      description: "없으면 넘어가도 돼요.",
      body: (<>
        <PhotoPicker value={image} onChange={(img) => draft.update({ image: img })} onError={setError} onBusy={setPhotoBusy} label="사진 올리기 (선택)" />
        {!dog && <Options label="털 색" options={["모름", "흰색", "크림", "갈색", "검정색", "회색", "황색", "얼룩"]} value={v.color} onChange={(color) => set({ color })} />}
        {!dog && <Options label="크기" options={["모름", "소형", "중형", "대형"]} value={v.size} onChange={(size) => set({ size })} />}
        <TextField label="더 알려줄 내용 (선택)" name="description" multiline value={v.description} onChange={(description) => set({ description })} maxLength={1000} placeholder={"예: 빨간 목줄을 하고 있었어요.\n편의점 앞을 지나 공원 쪽으로 뛰어갔어요."}
          hint="모습, 이동 상황, 맡긴 보호소·경찰서 이름을 적으면 보호자에게 큰 도움이 돼요." />
      </>),
      check: () => (photoBusy ? "사진을 준비하고 있어요. 잠시만 기다려주세요." : undefined),
    },
    {
      title: "이대로 알릴까요?",
      description: dog ? "보호자에게 바로 알림이 가요." : "찾고 있는 보호자가 볼 수 있어요.",
      body: (<>
        <div className={s.review}>
          {image && <img src={image} alt="제보 사진" />}
          <dl>
            {[["상황", v.kind], ["시간", whenLabel(v.time)], ["장소", `${v.region} · ${v.location}`],
              ["방향", v.directionMode === "moving" ? `${heading}°` : v.directionMode === "still" ? "머물러 있었어요" : "모름"], ["설명", v.description]]
              .filter(([, x]) => x).map(([k, x]) => <div key={k}><dt>{k}</dt><dd>{x}</dd></div>)}
          </dl>
        </div>
        <p className={s.notice}>보호 중인 정확한 위치와 대화는 당사자만 볼 수 있어요.</p>
      </>),
    },
  ];
  const submit = async () => {
    const report: Report = {
      id: newId("sighting"), dogId: dog?.id || null, kind: v.kind, region: v.region, coords: extra.coords,
      heading: v.directionMode === "moving" ? heading : null, stationary: v.directionMode === "still",
      location: v.location.trim(), time: new Date(v.time).toISOString(), description: v.description.trim(), image,
      color: dog ? dog.color : v.color, size: dog ? dog.size : v.size, status: "확인 전", messages: [], demo: false,
    };
    read().reports.unshift(report);
    await commit();
    draft.finish();
    location.hash = dog ? `/dog/${dog.id}` : "/sightings";
    toast("소중한 제보가 전달됐어요. 고마워요.");
  };
  const current = steps[step];
  const last = step === steps.length - 1;
  const next = async () => {
    const problem = current.check?.();
    if (problem) return setError(problem);
    setError("");
    if (!last) return setStep(step + 1);
    setBusy(true);
    try {
      await submit();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Flow step={step} total={steps.length} title={current.title}
      description={step === 0 && draft.restored ? "작성하던 내용을 불러왔어요." : current.description}
      error={error} busy={busy} nextLabel={last ? "목격 소식 남기기" : "다음"}
      onBack={() => { setError(""); setStep(step - 1); }} onNext={next}>
      {current.body}
    </Flow>
  );
}
