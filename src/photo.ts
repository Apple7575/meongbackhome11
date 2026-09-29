// 사진을 긴 변 1000px 이하 JPEG 데이터 URL로 줄인다. 옛 폼과 React 폼이 함께 쓴다.
export function readPhoto(file: File): Promise<string> {
  if (file.size > 15 * 1024 * 1024) return Promise.reject(new Error("사진은 15MB 이하로 골라주세요."));
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    return Promise.reject(new Error("JPG, PNG, WebP 사진을 골라주세요."));
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("사진을 읽을 수 없어요. 다른 사진을 골라주세요."));
    };
    img.src = url;
  });
}
