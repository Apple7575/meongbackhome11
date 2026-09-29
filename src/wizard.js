import { escapeHTML as esc } from "./domain.js";
const prefix = "meongback-draft-v2:";
export function loadDraft(key) {
  try {
    const d = JSON.parse(localStorage.getItem(prefix + key));
    return d && Date.now() - d.savedAt < 7 * 86400000 ? d : null;
  } catch {
    return null;
  }
}
export function clearDraft(key) {
  localStorage.removeItem(prefix + key);
}
// React 폼용: 옛 enhanceWizard와 같은 키·형식으로 저장한다. 저장 공간이 없으면 false.
export function saveDraft(key, { values, image = "", extra = {} }) {
  try {
    localStorage.setItem(prefix + key, JSON.stringify({ values, image, extra, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}
export function enhanceWizard(
  form,
  { key, kind, extra = () => ({}), validate = () => {}, onStep = () => {} },
) {
  const draft = loadDraft(key),
    title =
      kind === "sighting"
        ? ["목격한 장소", "방향과 특징", "확인 후 제보"]
        : kind === "profile"
          ? ["우리 아이 소개", "특징과 성격", "등록 확인"]
          : ["우리 아이 소개", "마지막 목격", "등록 확인"];
  let step = 0,
    complete = false,
    photoLoading = false;
  form.noValidate = true;
  const children = [...form.children],
    pages = [0, 1, 2].map((i) => {
      const el = document.createElement("section");
      el.className = "wizard-page";
      el.dataset.step = i;
      return el;
    });
  let grid = 0;
  for (const el of children) {
    let index = 0;
    if (el.matches("button[type=submit],.local-notice")) index = 2;
    else if (kind === "sighting") {
      index =
        el.matches(".photo-upload,.direction-section") ||
        el.querySelector("textarea,[name=color]")
          ? 1
          : 0;
    } else if (kind === "profile") {
      index = el.querySelector("textarea") ? 1 : 0;
    } else {
      if (el.classList.contains("form-grid")) {
        index = grid++ === 0 ? 0 : 1;
      } else
        index =
          el.matches(".photo-upload") || el.querySelector("textarea") ? 0 : 1;
    }
    pages[index].append(el);
  }
  const header = document.createElement("div");
  header.className = "wizard-header";
  header.innerHTML = `<div class="wizard-progress">${title.map((t, i) => `<span data-progress="${i}"><b>${i + 1}</b>${t}</span>`).join("")}</div><p class="draft-status" role="status">${draft ? "이전에 작성하던 내용을 불러왔어요." : "작성 중인 내용은 7일 동안 이 기기에 보관돼요."}</p>`;
  form.prepend(header);
  for (const p of pages) form.append(p);
  const review = document.createElement("div");
  review.className = "wizard-review";
  pages[2].prepend(review);
  const actions = document.createElement("div");
  actions.className = "wizard-actions";
  actions.innerHTML =
    '<button type="button" class="button white wizard-back">이전</button><button type="button" class="button primary wizard-next">다음으로 <span>→</span></button>';
  form.append(actions);
  if (draft) {
    for (const [name, value] of Object.entries(draft.values || {})) {
      const els = form.querySelectorAll(`[name="${CSS.escape(name)}"]`);
      for (const el of els) {
        if (el.type === "file") continue;
        if (el.type === "radio" || el.type === "checkbox")
          el.checked = el.value === value;
        else el.value = value;
      }
    }
    if (draft.image) {
      form._photo = draft.image;
      form.querySelector(".photo-preview").innerHTML =
        `<img src="${esc(draft.image)}" alt="복원된 강아지 사진"/>`;
    }
  }
  const snapshot = () => {
    if (complete || photoLoading) return;
    const values = {};
    for (const [name, value] of new FormData(form))
      if (typeof value === "string") values[name] = value;
    try {
      localStorage.setItem(
        prefix + key,
        JSON.stringify({
          values,
          image:
            form._photo || form.querySelector(".photo-preview img")?.src || "",
          extra: extra(),
          savedAt: Date.now(),
        }),
      );
      header.querySelector(".draft-status").textContent =
        "초안을 저장했어요 · 이어서 작성할 수 있어요";
    } catch {
      header.querySelector(".draft-status").textContent =
        "이 기기에 초안을 저장하지 못했어요. 창을 닫기 전에 등록을 완료해주세요.";
    }
  };
  const show = () => {
    pages.forEach((p, i) => (p.hidden = i !== step));
    header.querySelectorAll("[data-progress]").forEach((p, i) => {
      p.classList.toggle("current", i === step);
      p.classList.toggle("done", i < step);
      p.setAttribute("aria-current", i === step ? "step" : "false");
    });
    actions.querySelector(".wizard-back").hidden = step === 0;
    actions.querySelector(".wizard-next").hidden = step === 2;
    if (step === 2) {
      const f = Object.fromEntries(new FormData(form));
      review.innerHTML = `<img src="${esc(form._photo || form.querySelector(".photo-preview img")?.src || "/assets/mascot-alert.webp")}" alt="등록 전 확인 사진"/><span class="eyebrow">마지막으로 한 번만 확인해주세요</span><h3>${esc(f.name || f.kind || "우리 아이")}</h3><dl>${[
        ["장소", f.location],
        ["시간", f.time?.replace("T", " ")],
        ["견종", f.breed],
        ["특징", f.description],
        [
          "이동 상태",
          f.directionMode === "still"
            ? "머물러 있었어요"
            : f.directionMode === "moving"
              ? "이동 방향을 표시했어요"
              : null,
        ],
      ]
        .filter(([, v]) => v)
        .map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`)
        .join("")}</dl>`;
    }
    onStep(step);
    form.closest(".modal")?.scrollTo({ top: 0, behavior: "smooth" });
  };
  actions.querySelector(".wizard-next").onclick = async () => {
    try {
      if (photoLoading)
        throw new Error("사진을 준비하고 있어요. 잠시만 기다려주세요.");
      for (const el of pages[step].querySelectorAll("input,select,textarea"))
        if (!el.checkValidity()) {
          el.reportValidity();
          return;
        }
      if (
        kind !== "sighting" &&
        step === 0 &&
        !form._photo &&
        !form.querySelector(".photo-preview img")
      )
        throw new Error("우리 아이 사진을 한 장 올려주세요.");
      validate(step);
      form.querySelector(".wizard-error")?.remove();
      snapshot();
      step++;
      show();
    } catch (e) {
      let el = form.querySelector(".wizard-error");
      if (!el) {
        el = document.createElement("p");
        el.className = "form-error wizard-error";
        el.setAttribute("role", "alert");
        header.append(el);
      }
      el.textContent = e.message;
    }
  };
  actions.querySelector(".wizard-back").onclick = () => {
    step = Math.max(0, step - 1);
    show();
  };
  const onChange = () => setTimeout(snapshot, 50);
  form.addEventListener("input", onChange);
  form.addEventListener("change", onChange);
  form.addEventListener("pointerup", onChange);
  form.addEventListener("photo-processing", () => {
    photoLoading = true;
    actions.querySelector(".wizard-next").disabled = true;
  });
  form.addEventListener("photo-ready", () => {
    photoLoading = false;
    actions.querySelector(".wizard-next").disabled = false;
    snapshot();
  });
  form.addEventListener(
    "submit",
    (e) => {
      if (step !== 2) {
        e.preventDefault();
        e.stopImmediatePropagation();
        actions.querySelector(".wizard-next").click();
      }
    },
    { capture: true },
  );
  show();
  return {
    complete() {
      complete = true;
      clearDraft(key);
    },
    dispose() {
      snapshot();
      form.removeEventListener("input", onChange);
      form.removeEventListener("change", onChange);
      form.removeEventListener("pointerup", onChange);
    },
  };
}
