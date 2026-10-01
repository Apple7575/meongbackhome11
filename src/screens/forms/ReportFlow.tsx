import { useRef, useState } from "react";
import { placeText } from "../../format.ts";
import { useStore } from "../../app/useStore.ts";
import { commit } from "../../app/actions.ts";
import { read, id as newId } from "../../client-store.js";
import { toast } from "../../app/toast.ts";
import { openSheet } from "../../app/sheets.ts";
import { COORDS, nearestRegion } from "../../domain.js";
import { EmptyState, SkeletonRows } from "../../ui/index.tsx";
import Flow from "./Flow.tsx";
import { TextField, Options, QuickChips, MultiOptions, AgeField, PhotoPicker, ExtraPhotos, WhenField, WhereField, whenLabel, toLocalInput } from "./fields.tsx";
import { useDraft } from "./useDraft.ts";
import s from "./forms.module.css";
import type { ReactNode } from "react";
import type { Coords, Dog, Profile } from "../../types.ts";
import { errorText } from "../../errors.ts";
type Mode = "new" | "from" | "edit" | "profile";
const BREEDS = ["말티즈", "푸들", "포메라니안", "비숑", "시츄", "치와와", "진돗개", "웰시코기", "골든리트리버", "믹스"];
const COLORS = ["흰색", "크림", "갈색", "검정색", "회색", "황색", "얼룩"];
const ACCESSORIES = ["없음", "목줄", "하네스", "옷", "인식표"];
// 예전 신고의 '여아·남아'를 새 표현으로 바꿔 보여준다.
const SEX: Record<string, string> = { 여아: "암컷", 남아: "수컷" };
interface ReportValues {
  name: string; breed: string; age: string; sex: string; color: string; size: string; accessory: string;
  region: string; time: string; location: string; description: string;
}
interface ReportExtra { coords: Coords; picked: boolean; address?: string; short?: string; images?: string[] }
interface Step { title: string; description: string; body: ReactNode; check?: () => string | undefined }
// mode: new(새 신고) · from(프로필로 신고) · edit(수정) · profile(우리 집 강아지 등록)
export default function ReportFlow({ mode, id }: { mode: Mode; id?: string }) {
  const db = useStore();
  const edit = mode === "edit" ? db.dogs.find((d) => d.id === id && d.canManage) : null;
  const profile = mode === "from" ? db.profiles.find((p) => p.id === id) : null;
  if ((mode === "edit" && !edit) || (mode === "from" && !profile))
    return db.connection === "loading" ? <SkeletonRows /> : <EmptyState title="수정할 신고를 찾을 수 없어요" description="마이홈에서 다시 골라주세요" />;
  return <ReportForm key={`${mode}-${id || ""}`} mode={mode} edit={edit} profile={profile} />;
}
function ReportForm({ mode, edit, profile }: { mode: Mode; edit?: Dog | null; profile?: Profile | null }) {
  const profileOnly = mode === "profile";
  const base: Partial<Dog> = edit || profile || {};
  const key = profileOnly ? "profile" : `dog-${edit?.id || profile?.id || "new"}`;
  const draft = useDraft<ReportValues, ReportExtra>(key, {
    values: {
      name: base.name || "", breed: base.breed || "", age: base.age || "", sex: SEX[base.sex || ""] || base.sex || "모름",
      color: base.color || "", size: base.size || "소형", accessory: base.accessory || "",
      region: base.region || "서울", time: base.time ? toLocalInput(base.time) : toLocalInput(),
      location: base.location || "", description: base.description || "",
    },
    image: base.image || "",
    extra: { coords: base.coords || COORDS[base.region || "서울"], picked: !!edit, images: base.images || [] },
  });
  const { values: v, image, extra } = draft;
  const set = (values: Partial<ReportValues>) => draft.update({ values });
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const submitRef = useRef<(() => Promise<void>) | null>(null);
  // 주소를 아직 못 찾았거나 찾지 못해도 핀 위치는 정확하므로 막지 않는다.
  const place = () => v.location.trim() || extra.short || extra.address || "지도에 표시한 곳";
  const steps: Step[] = [
    {
      title: profileOnly ? "우리 아이 사진을 올려주세요" : "잃어버린 아이의 사진을 올려주세요",
      description: "얼굴과 털 색이 잘 보이면 이웃이 알아보기 쉬워요.",
      body: (<>
        <PhotoPicker value={image} onChange={(img) => draft.update({ image: img })} onError={setError} onBusy={setPhotoBusy} label="강아지 사진 올리기" />
        {image && <ExtraPhotos values={extra.images || []} onChange={(images) => draft.update({ extra: { images } })} onError={setError} onBusy={setPhotoBusy} />}
      </>),
      check: () => {
        if (photoBusy) return "사진을 준비하고 있어요. 잠시만 기다려주세요.";
        if (!image) return "사진을 한 장 올려주세요.";
      },
    },
    {
      title: "이름과 견종을 알려주세요",
      description: "아래에서 고르거나 직접 적어주세요. 모르면 '믹스'를 골라도 돼요.",
      body: (<>
        <TextField label="이름" name="name" value={v.name} onChange={(name) => set({ name })} maxLength={30} placeholder="예: 보리" autoComplete="off" />
        <TextField label="견종" name="breed" value={v.breed} onChange={(breed) => set({ breed })} maxLength={40} placeholder="예: 말티즈" autoComplete="off" />
        <QuickChips label="자주 찾는 견종" options={BREEDS} value={v.breed} onPick={(breed) => set({ breed })} />
      </>),
      check: () => (!v.name.trim() || !v.breed.trim() ? "이름과 견종을 적어주세요." : undefined),
    },
    {
      title: "어떤 특징이 있나요?",
      description: "고르기만 하면 돼요. 목록에 없으면 기타를 눌러 적어주세요.",
      body: (<>
        <Options label="성별" options={["수컷", "암컷", "모름"]} value={v.sex} onChange={(sex) => set({ sex })} />
        <MultiOptions label="털 색" options={COLORS} value={v.color} onChange={(color) => set({ color })} otherPlaceholder="예: 은색, 흰색 바탕에 갈색 점" />
        <Options label="크기" options={["소형", "중형", "대형"]} value={v.size} onChange={(size) => set({ size })} />
        {!profileOnly && <MultiOptions label="착용물" options={ACCESSORIES} exclusive="없음" value={v.accessory} onChange={(accessory) => set({ accessory })} otherPlaceholder="예: 빨간 방울, 파란 우비" />}
        <AgeField value={v.age} onChange={(age) => set({ age })} />
      </>),
      check: () => (!v.color.trim() ? "털 색을 하나 이상 골라주세요." : undefined),
    },
    ...(profileOnly ? [] : [
      {
        title: "언제 잃어버렸나요?",
        description: "대략적인 시간도 괜찮아요.",
        body: <WhenField value={v.time} onChange={(time) => set({ time })} />,
        check: () => (!v.time ? "시간을 골라주세요." : new Date(v.time) > new Date() ? "지금보다 미래일 수는 없어요." : undefined),
      },
      {
        title: "마지막으로 본 곳은 어디인가요?",
        description: "정확한 지점일수록 목격 제보를 연결하기 쉬워요.",
        body: (
          <WhereField mapId="location-picker" location={v.location} placeholder="예: 석촌호수 동호 입구 편의점 앞"
            coords={extra.coords} picked={extra.picked} address={extra.address || ""} onMessage={toast}
            onLocation={(location) => set({ location })}
            onPick={(coords) => draft.update({ values: { region: nearestRegion(coords) }, extra: { coords, picked: true, address: "", short: "" } })}
            onPlace={(place) => draft.update({ values: place?.region ? { region: place.region } : {}, extra: { address: place?.label || "", short: place?.short || "" } })} />
        ),
        check: () => (!extra.picked ? "지도를 움직여 마지막으로 본 곳에 핀을 맞춰주세요." : undefined),
      },
    ]),
    {
      title: "더 알려줄 특징이 있나요?",
      description: "이웃이 한눈에 알아볼 수 있는 점을 적어주세요. 없으면 넘어가도 돼요.",
      body: <TextField label="특징 (선택)" name="description" multiline value={v.description} onChange={(description) => set({ description })} maxLength={1000}
        placeholder={"예: 왼쪽 귀에 갈색 점이 있어요.\n겁이 많아서 부르면 도망갈 수 있어요.\n'보리야' 부르면 꼬리를 흔들어요."}
        hint="무늬·흉터, 성격, 이름을 부르면 어떻게 반응하는지 적으면 좋아요." />,
    },
    {
      title: profileOnly ? "이대로 저장할까요?" : edit ? "이대로 고칠까요?" : "이대로 등록할까요?",
      description: profileOnly ? "필요할 때 바로 신고할 수 있어요." : "등록하면 이웃에게 바로 알려요.",
      body: (<>
        <div className={s.review}>
          {image && <img src={image} alt="등록할 사진" />}
          <dl>
            {[["이름", v.name], ["견종", v.breed], ["특징", [v.sex === "모름" ? "성별 모름" : v.sex, v.color, v.size, v.age, !profileOnly && v.accessory].filter(Boolean).join(" · ")],
              ...(profileOnly ? [] : [["시간", whenLabel(v.time)], ["장소", placeText(v.region, place())]]), ["설명", v.description]]
              .filter(([, x]) => x).map(([k, x]) => <div key={k}><dt>{k}</dt><dd>{x}</dd></div>)}
          </dl>
        </div>
        {!profileOnly && <p className={s.notice}>사진과 장소는 함께 찾는 이웃에게 공개돼요. 연락처는 적지 말아주세요.</p>}
      </>),
    },
  ];
  const submit = async () => {
    const values = { ...v, name: v.name.trim(), breed: v.breed.trim(), location: place(), description: v.description.trim() };
    if (!profileOnly && !read().user?.registered) {
      openSheet("auth", { after: () => submitRef.current?.() });
      return;
    }
    if (!profileOnly && read().user?.verificationRequired && !read().user?.verified)
      throw new Error("받은 메일에서 이메일 인증을 마치면 바로 등록할 수 있어요. 작성한 내용은 이 기기에 7일 동안 보관돼요.");
    if (profileOnly) {
      // 프로필에는 신고용 값(시간·지역·장소·착용물)을 저장하지 않는다.
      const { time: _t, region: _r, location: _l, accessory: _a, ...rest } = values;
      read().profiles.push({ ...rest, image, images: extra.images || [], id: newId("profile") });
      await commit();
      draft.finish();
      // 다 쓴 작성 화면으로 뒤로 가지 않도록 방문 기록을 바꿔치기한다.
      location.replace("#/my");
      toast("우리 아이 프로필을 저장했어요.");
      return;
    }
    const target = edit ? read().dogs.find((d) => d.id === edit.id) : null;
    const entry = {
      ...values, id: target?.id || newId("dog"), coords: extra.coords, image, images: extra.images || [],
      time: new Date(values.time).toISOString(), status: target?.status || "missing", demo: false,
    };
    if (target) Object.assign(target, entry);
    else read().dogs.unshift(entry);
    await commit();
    draft.finish();
    // 다 쓴 작성 화면으로 뒤로 가지 않도록 방문 기록을 바꿔치기한다(뒤로 가면 신고 전 화면).
    location.replace(`#/dog/${entry.id}`);
    if (!target) setTimeout(() => openSheet("success", { dogId: entry.id }), 80);
    toast(target ? "신고를 고쳤어요." : "신고가 등록됐어요. 이제 이웃에게 알려주세요.");
  };
  const run = async () => {
    setBusy(true);
    try {
      await submit();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  submitRef.current = run;
  const current = steps[step];
  const last = step === steps.length - 1;
  const next = () => {
    const problem = current.check?.();
    if (problem) return setError(problem);
    setError("");
    if (last) run();
    else setStep(step + 1);
  };
  return (
    <Flow
      step={step}
      total={steps.length}
      title={current.title}
      description={step === 0 && draft.restored ? "작성하던 내용을 불러왔어요." : current.description}
      error={error}
      busy={busy}
      nextLabel={last ? (profileOnly ? "프로필 저장하기" : edit ? "수정 내용 저장" : "실종 신고 등록하기") : "다음"}
      onBack={() => { setError(""); setStep(step - 1); }}
      onNext={next}
    >
      {current.body}
    </Flow>
  );
}
