// catch로 받은 값(unknown)을 사용자에게 보여줄 문구로 바꾼다.
export const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e));
