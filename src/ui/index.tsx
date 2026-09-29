import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import Icon from "./Icon.tsx";
import type { IconName } from "./Icon.tsx";
import s from "./ui.module.css";
const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");
// data-* 속성(예: data-action, data-id)을 함께 넘길 수 있게 한다.
type DataAttrs = { [key: `data-${string}`]: string | undefined };

export interface TopProps {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}
export function Top({ title, subtitle, right }: TopProps) {
  return (
    <div className={s.top}>
      <div>
        <h1 className={s.topTitle}>{title}</h1>
        {subtitle && <p className={s.topSub}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
export function ListHeader({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className={s.listHeader}>
      <h2>{title}</h2>
      {action}
    </div>
  );
}
export type ListRowProps = {
  as?: "a" | "button" | "div";
  href?: string;
  left?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  right?: ReactNode;
  tone?: "muted";
  onClick?: () => void;
} & DataAttrs & Pick<HTMLAttributes<HTMLElement>, "aria-current">;
export function ListRow({ as, href, left, title, description, right, tone, ...rest }: ListRowProps) {
  const Tag = href ? "a" : as || "div";
  const interactive = Tag !== "div";
  return (
    <Tag
      className={cx(s.row, interactive && s.rowInteractive, tone === "muted" && s.muted)}
      href={href}
      type={Tag === "button" ? "button" : undefined}
      {...rest}
    >
      {left && <span className={s.rowLeft}>{left}</span>}
      <span className={s.rowBody}>
        <span className={s.rowTitle}>{title}</span>
        {description && <span className={s.rowDesc}>{description}</span>}
      </span>
      {right !== undefined ? (
        <span className={s.rowRight}>{right}</span>
      ) : (
        interactive && <Icon name="ChevronRight" size={20} className={s.chevron} />
      )}
    </Tag>
  );
}
export type Variant = "fill" | "weak";
export type Size = "sm" | "md" | "lg";
interface ButtonLook {
  variant?: Variant;
  size?: Size;
  full?: boolean;
}
export const buttonClass = ({ variant = "fill", size = "md", full }: ButtonLook) =>
  cx(s.button, s[variant], s[size], full && s.full);
export type ButtonProps = ButtonLook & ButtonHTMLAttributes<HTMLButtonElement> & DataAttrs;
export function Button({ variant = "fill", size = "md", full, className, ...rest }: ButtonProps) {
  return <button type="button" data-variant={variant} className={cx(buttonClass({ variant, size, full }), className)} {...rest} />;
}
export function ButtonLink({ href, variant = "fill", size = "md", full, children }: ButtonLook & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={href} data-variant={variant} className={buttonClass({ variant, size, full })}>{children}</a>;
}
export function BottomCTA(props: ButtonProps) {
  return (
    <div className={s.bottomCta}>
      <Button size="lg" full {...props} />
    </div>
  );
}
export type Tone = "grey" | "coral" | "green";
export function Badge({ tone = "grey", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx(s.badge, s[tone])}>{children}</span>;
}
export interface ChipProps {
  onClick: () => void;
  icon?: "ChevronDown" | "SlidersHorizontal";
  expanded?: boolean;
  children: ReactNode;
}
export function Chip({ onClick, icon = "ChevronDown", expanded, children }: ChipProps) {
  return (
    <button type="button" className={s.chip} onClick={onClick} aria-haspopup="dialog" aria-expanded={expanded}>
      {icon === "SlidersHorizontal" && <Icon name={icon} size={16} />}
      {children}
      {icon === "ChevronDown" && <Icon name={icon} size={16} />}
    </button>
  );
}
export function Divider() {
  return <div className={s.band} role="presentation" />;
}
export function Thumb({ src, size = 56 }: { src?: string; size?: 56 | 72 }) {
  return <img className={s.thumb} src={src || "/assets/mascot-home.webp"} alt="" width={size} height={size} loading="lazy" />;
}
export function IconCircle({ name, tone = "grey" }: { name: IconName; tone?: "grey" | "coral" }) {
  return (
    <span className={cx(s.iconCircle, tone === "coral" && s.iconCoral)}>
      <Icon name={name} size={20} />
    </span>
  );
}
export interface EmptyStateProps {
  image?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}
export function EmptyState({ image, title, description, action }: EmptyStateProps) {
  return (
    <div className={s.empty}>
      {image && <img src={image} alt="" />}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div role="status" aria-label="불러오는 중">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={s.skeleton} aria-hidden="true">
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
