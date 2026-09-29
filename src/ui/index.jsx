import Icon from "./Icon.jsx";
import s from "./ui.module.css";
const cx = (...c) => c.filter(Boolean).join(" ");
export function Top({ title, subtitle, right }) {
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
export function ListHeader({ title, action }) {
  return (
    <div className={s.listHeader}>
      <h2>{title}</h2>
      {action}
    </div>
  );
}
export function ListRow({ as, href, left, title, description, right, tone, ...rest }) {
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
export const buttonClass = ({ variant = "fill", size = "md", full }) =>
  cx(s.button, s[variant], s[size], full && s.full);
export function Button({ variant = "fill", size = "md", full, className, ...rest }) {
  return <button type="button" data-variant={variant} className={cx(buttonClass({ variant, size, full }), className)} {...rest} />;
}
export function ButtonLink({ href, variant = "fill", size = "md", full, children }) {
  return <a href={href} data-variant={variant} className={buttonClass({ variant, size, full })}>{children}</a>;
}
export function BottomCTA(props) {
  return (
    <div className={s.bottomCta}>
      <Button size="lg" full {...props} />
    </div>
  );
}
export function Badge({ tone = "grey", children }) {
  return <span className={cx(s.badge, s[tone])}>{children}</span>;
}
export function Chip({ onClick, icon = "ChevronDown", expanded, children }) {
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
export function Thumb({ src, size = 56 }) {
  return <img className={s.thumb} src={src || "/assets/mascot-home.webp"} alt="" width={size} height={size} loading="lazy" />;
}
export function IconCircle({ name, tone = "grey" }) {
  return (
    <span className={cx(s.iconCircle, tone === "coral" && s.iconCoral)}>
      <Icon name={name} size={20} />
    </span>
  );
}
export function EmptyState({ image, title, description, action }) {
  return (
    <div className={s.empty}>
      {image && <img src={image} alt="" />}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function SkeletonRows({ count = 5 }) {
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
