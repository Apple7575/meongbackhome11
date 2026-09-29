# Vercel Hobby + Supabase Free 배포

현재 선택한 배포 구성입니다. 유료 플랜·유료 체험·Render 디스크·Cloudflare 임시 터널을 사용하지 않습니다. Vercel과 Supabase에 연결하면 노트북 전원과 독립적으로 동작합니다. 무료 사용량 한도와 Supabase 비활성 프로젝트 일시 중지는 그대로 적용됩니다.

## 구성

- Vercel: Vite 정적 웹 + `api/index.js` Express 서버리스 함수, 서울 리전.
- Supabase PostgreSQL: 신고, 제보, 대화, 계정, 세션, 인증 토큰, 알림, 발송 큐.
- Supabase Storage: 비공개 `meongback-photos` 버킷. 업로드 시 WebP로 변환하고 EXIF를 제거합니다. 당사자 확인 후 같은 출처의 `/api/media/:id`로 제공합니다.
- 계정 인증은 기존 scrypt + HTTP-only 세션 방식입니다. **Supabase Auth를 사용하는 구성은 아닙니다.** 이메일 인증·비밀번호 복구는 Resend로 발송합니다.
- 서버리스 환경에서는 열린 화면이 15초마다 새 소식을 확인합니다. 백그라운드 Web Push는 저장 직후 `waitUntil`로 처리하며, 실패한 발송은 다음 요청 또는 일일 정리 작업에서 재시도합니다. 즉시 재시도가 보장되는 상시 워커는 없습니다.
- 일일 정리 작업은 무료 Hobby의 하루 1회 제한에 맞춥니다. 원본 파일을 참조하지 않는 사진은 24시간 이후 삭제 대상입니다.

## 연결 및 배포

1. Supabase **Free 조직**의 프로젝트를 선택합니다. 가능한 경우 서울 리전을 선택합니다. 기존 다른 서비스 DB를 재사용하기 전에 용도를 확인합니다.
2. `.env.cloud.example`을 `.env.cloud`로 복사하고 실제 값을 **로컬 파일**에 입력합니다. 비밀 값은 채팅·Git·VITE_ 환경 변수에 넣지 않습니다. DB 주소는 Connect의 Transaction pooler, 포트 6543을 사용하며 비밀번호를 URL 인코딩합니다.
3. `npm run cloud:setup`으로 `meongback` 전용 스키마와 비공개 사진 버킷을 만듭니다. 기존 public 스키마나 다른 버킷은 변경하지 않습니다. 실제 DB에 실행하기 전 선택한 프로젝트를 확인합니다.
4. `npm run cloud:check`로 필요한 환경 변수의 형식을 검사합니다. 인증 메일 발신 도메인과 Resend 무료 계정 설정이 필요합니다. 기본 테스트 발신자는 일반 이용자에게 보낼 수 있는 운영 발신자가 아닙니다.
5. Vercel Hobby 프로젝트를 루트 디렉터리 `.` / Vite / Node.js 24로 연결합니다. 기존 Next.js 모노레포 프로젝트에 덮어쓰려면 기존 설정도 바꿔야 하므로 새 프로젝트가 기본 선택입니다.
6. `.env.cloud`에 있는 서버 환경 변수를 Vercel **Production**에 등록합니다. `PUBLIC_ORIGIN`은 고정 운영 주소입니다. Preview는 운영 DB를 공유하지 않습니다.
7. `npm test`, `npm run build`, `npm run test:browser`를 실행한 뒤 `vercel --prod`로 배포합니다.
8. `node scripts/smoke-public.mjs https://실제주소`로 HTTPS, 쿠키, 예시 데이터 제외, API 응답을 확인합니다. 별도로 두 계정으로 사진 첨부 제보 → 보호자 조회 → 재회 알림과 인증 메일 도착을 검증합니다.

## 운영 시 확인

- iPhone Safari에서 URL로 사용합니다. 푸시는 홈 화면에 추가한 웹앱에서 실제 도착을 확인해야 합니다. 로컬 브라우저 테스트는 실기기 검증을 대신하지 않습니다.
- Free는 관리형 일일 백업을 제공하지 않습니다. DB는 Supabase CLI의 `db dump`, 사진은 Storage에서 별도로 백업해야 합니다. DB 덤프에는 사진 원본이 들어 있지 않습니다.
- 사용자 수가 늘면 사진 전송량과 DB 용량을 먼저 확인합니다. 현재 상태 조회는 전체 공개 신고를 읽으므로 전국 대규모 운영 전에는 페이지 단위 조회·지도 범위 조회로 개선해야 합니다.
- Vercel Hobby는 개인 비상업 용도입니다. 광고·유료 기능 등 사업 운영으로 바꾸기 전에는 플랜 조건을 다시 확인합니다. 자동으로 유료 전환하지 않습니다.

공식 기준: [Supabase 요금](https://supabase.com/pricing), [무료 프로젝트 일시 중지](https://supabase.com/docs/guides/platform/free-project-pausing), [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Cron 제한](https://vercel.com/docs/cron-jobs/usage-and-pricing).

## 현재 연결 상태

2026-09-08: 무료 Hobby 계정에 기존 `meongbackhome`과 별개인 `meongback-home` 프로젝트를 생성했습니다. Vercel 실제 빌드와 함수 배포가 성공했고 고정 주소는 `https://meongback-home.vercel.app`입니다. 최초 배포는 Vercel이 Production으로 자동 지정했습니다.

**Supabase 로그인과 실제 DB·사진 저장소·메일 환경 변수 연결은 아직 완료되지 않았습니다. 현재 API는 준비 중(503)으로 응답하도록 차단되며 실사용 가능한 배포 완료 상태가 아닙니다.** Supabase 인증 이후 마이그레이션, 운영 환경 변수 등록, 재배포와 외부 검증을 이어가야 합니다.

2026-09-20 점검: 새 `멍백홈` 조직(`hqaeqhplyiirleiiqawq`)과 서울 리전 프로젝트 `meongback-home`(`uzcaunhxjuiyjzbzmyfl`)을 만들었습니다. `meongback` 스키마 마이그레이션과 비공개 `meongback-photos` Storage 버킷을 적용했고, Vercel Production에 Supabase URL·서버 키·운영 주소를 등록했습니다. DB 비밀번호는 Supabase가 생성 뒤 다시 보여주지 않으므로 아직 `DATABASE_URL`만 비어 있습니다. Dashboard의 Database Settings에서 비밀번호를 직접 설정하고 Transaction pooler(6543) 연결 문자열을 로컬 `.env.cloud`에 입력한 뒤 `npm run cloud:check`와 Vercel 환경 변수 등록을 진행해야 합니다. `SERVICE_NOT_CONFIGURED`는 필수 DB 연결 누락, `SERVICE_UNAVAILABLE`은 그 외 연결 실패로 구분합니다. 첫 상태 조회가 실패하면 EventSource를 만들지 않습니다. 설정 미완료 상태에서는 자동 폴링도 중단하고 실제 저장 불가를 명시합니다. 메일·푸시·정리 작업 설정은 전체 API 시작의 필수 조건에서 제외했으며, 인증 메일이 없으면 신규 가입만 차단합니다.
