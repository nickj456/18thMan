/* @ds-bundle: {"format":4,"namespace":"Ds18thManDesignSystem_bb5a4a","components":[{"name":"Avatar","sourcePath":"components/data-display/Avatar.jsx"},{"name":"Badge","sourcePath":"components/data-display/Badge.jsx"},{"name":"Card","sourcePath":"components/data-display/Card.jsx"},{"name":"CardHeader","sourcePath":"components/data-display/Card.jsx"},{"name":"CardTitle","sourcePath":"components/data-display/Card.jsx"},{"name":"CardDescription","sourcePath":"components/data-display/Card.jsx"},{"name":"CardContent","sourcePath":"components/data-display/Card.jsx"},{"name":"CardFooter","sourcePath":"components/data-display/Card.jsx"},{"name":"Separator","sourcePath":"components/data-display/Separator.jsx"},{"name":"Skeleton","sourcePath":"components/data-display/Separator.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Label","sourcePath":"components/forms/Label.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"Dialog","sourcePath":"components/overlays/Dialog.jsx"},{"name":"Tooltip","sourcePath":"components/overlays/Tooltip.jsx"}],"sourceHashes":{"components/data-display/Avatar.jsx":"f7e0591b1c15","components/data-display/Badge.jsx":"663ca264fdc7","components/data-display/Card.jsx":"631689a44d7d","components/data-display/Separator.jsx":"438d68ab2925","components/forms/Button.jsx":"44ad737d0fe5","components/forms/Checkbox.jsx":"aff9abc0a89d","components/forms/Input.jsx":"e049cac840a1","components/forms/Label.jsx":"5cf48f9d2190","components/forms/Select.jsx":"2e8ddfe914a4","components/forms/Switch.jsx":"439e6d9e2eb2","components/forms/Textarea.jsx":"daba8b18761a","components/navigation/Tabs.jsx":"8a176d05f97a","components/overlays/Dialog.jsx":"02e77548edce","components/overlays/Tooltip.jsx":"21ac3f050439","ui_kits/app-dashboard/app-shell.js":"2e816765f375","ui_kits/marketing-website/MarketingHome.jsx":"f5cc8c9b25ce"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.Ds18thManDesignSystem_bb5a4a = window.Ds18thManDesignSystem_bb5a4a || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/data-display/Avatar.jsx
try { (() => {
function Avatar({
  src,
  name,
  size = 'default',
  style
}) {
  const px = size === 'sm' ? 24 : size === 'lg' ? 40 : 32;
  const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: px,
      height: px,
      borderRadius: '50%',
      overflow: 'hidden',
      flexShrink: 0,
      position: 'relative',
      boxShadow: 'inset 0 0 0 1px var(--border-hairline)',
      background: 'var(--surface-muted)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...style
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name || 'avatar',
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: px * 0.4,
      color: 'var(--accent)',
      fontWeight: 600
    }
  }, initials));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const variants = {
  default: {
    background: 'var(--accent)',
    color: 'var(--accent-foreground)'
  },
  secondary: {
    background: 'var(--surface-muted)',
    color: 'var(--text-primary)'
  },
  destructive: {
    background: 'color-mix(in oklch, var(--destructive) 12%, transparent)',
    color: 'var(--destructive)'
  },
  outline: {
    background: 'transparent',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-hairline)'
  }
};
function Badge({
  variant = 'default',
  children,
  style,
  ...props
}) {
  const v = variants[variant] || variants.default;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      height: 20,
      padding: '0 8px',
      borderRadius: 'var(--radius-full)',
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      fontWeight: 500,
      whiteSpace: 'nowrap',
      border: '1px solid transparent',
      ...v,
      ...style
    }
  }, props), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Card({
  children,
  style,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'var(--surface-card)',
      color: 'var(--text-primary)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--ring-hairline)',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, props), children);
}
function CardHeader({
  children,
  style,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'grid',
      gap: 4,
      ...style
    }
  }, props), children);
}
function CardTitle({
  children,
  style,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      fontSize: 16,
      fontWeight: 500,
      lineHeight: 1.3,
      ...style
    }
  }, props), children);
}
function CardDescription({
  children,
  style,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      fontSize: 14,
      color: 'var(--text-secondary)',
      ...style
    }
  }, props), children);
}
function CardContent({
  children,
  style,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: style
  }, props), children);
}
function CardFooter({
  children,
  style,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      borderTop: '1px solid var(--border-hairline)',
      background: 'color-mix(in oklch, var(--surface-muted) 50%, transparent)',
      margin: '0 -16px -16px',
      padding: 16,
      borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
      ...style
    }
  }, props), children);
}
Object.assign(__ds_scope, { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Card.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Separator.jsx
try { (() => {
function Separator({
  orientation = 'horizontal',
  style
}) {
  return orientation === 'vertical' ? /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      alignSelf: 'stretch',
      background: 'var(--border-hairline)',
      ...style
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      width: '100%',
      background: 'var(--border-hairline)',
      ...style
    }
  });
}
function Skeleton({
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'color-mix(in oklch, var(--surface-muted) 60%, transparent)',
      borderRadius: 'var(--radius-md)',
      animation: 'ds-pulse 1.6s ease-in-out infinite',
      ...style
    }
  }, /*#__PURE__*/React.createElement("style", null, `@keyframes ds-pulse{0%,100%{opacity:1}50%{opacity:.5}}`));
}
Object.assign(__ds_scope, { Separator, Skeleton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Separator.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const base = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  border: '1px solid transparent',
  borderRadius: 'var(--radius-lg)',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.875rem',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all .15s',
  whiteSpace: 'nowrap',
  outline: 'none',
  boxSizing: 'border-box'
};
const variants = {
  default: {
    background: 'var(--accent)',
    color: 'var(--accent-foreground)'
  },
  outline: {
    background: 'transparent',
    color: 'var(--text-primary)',
    borderColor: 'var(--border-hairline)'
  },
  secondary: {
    background: 'var(--surface-muted)',
    color: 'var(--text-primary)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-primary)'
  },
  destructive: {
    background: 'color-mix(in oklch, var(--destructive) 12%, transparent)',
    color: 'var(--destructive)'
  },
  link: {
    background: 'transparent',
    color: 'var(--accent)',
    textDecoration: 'underline',
    textUnderlineOffset: '4px',
    padding: 0,
    height: 'auto',
    border: 'none'
  }
};
const sizes = {
  default: {
    height: 32,
    padding: '0 10px'
  },
  sm: {
    height: 28,
    padding: '0 10px',
    fontSize: '0.8rem'
  },
  lg: {
    height: 36,
    padding: '0 12px'
  },
  icon: {
    height: 32,
    width: 32,
    padding: 0
  }
};
function Button({
  variant = 'default',
  size = 'default',
  disabled,
  children,
  style,
  ...props
}) {
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const v = variants[variant] || variants.default;
  const s = sizes[size] || sizes.default;
  const hoverOpacity = ['default', 'secondary', 'destructive'].includes(variant) && hover ? 0.8 : 1;
  const hoverBg = (variant === 'outline' || variant === 'ghost') && hover ? 'var(--surface-muted)' : v.background;
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false),
    style: {
      ...base,
      ...v,
      ...s,
      background: hoverBg,
      opacity: disabled ? 0.5 : hoverOpacity,
      transform: active && !disabled ? 'translateY(1px)' : 'none',
      pointerEvents: disabled ? 'none' : 'auto',
      ...style
    }
  }, props), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Checkbox({
  checked,
  onChange,
  disabled,
  style,
  ...props
}) {
  const [isChecked, setIsChecked] = React.useState(!!checked);
  React.useEffect(() => setIsChecked(!!checked), [checked]);
  const toggle = () => {
    if (disabled) return;
    const next = !isChecked;
    setIsChecked(next);
    onChange?.(next);
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: "checkbox",
    "aria-checked": isChecked,
    disabled: disabled,
    onClick: toggle,
    style: {
      width: 16,
      height: 16,
      borderRadius: 4,
      flexShrink: 0,
      cursor: disabled ? 'not-allowed' : 'pointer',
      border: `1px solid ${isChecked ? 'var(--accent)' : 'var(--border-hairline)'}`,
      background: isChecked ? 'var(--accent)' : 'transparent',
      color: '#fff',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: disabled ? 0.5 : 1,
      padding: 0,
      transition: 'all .15s',
      ...style
    }
  }, props), isChecked && /*#__PURE__*/React.createElement("svg", {
    width: "11",
    height: "11",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6L9 17l-5-5"
  })));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  style,
  ...props
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("input", _extends({
    onFocus: e => {
      setFocus(true);
      props.onFocus?.(e);
    },
    onBlur: e => {
      setFocus(false);
      props.onBlur?.(e);
    },
    style: {
      height: 32,
      width: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
      borderRadius: 'var(--radius-lg)',
      border: `1px solid ${focus ? 'var(--ring-color)' : 'var(--border-hairline)'}`,
      background: 'transparent',
      color: 'var(--text-primary)',
      padding: '0 10px',
      fontFamily: 'var(--font-sans)',
      fontSize: '0.875rem',
      outline: 'none',
      boxShadow: focus ? 'var(--focus-ring)' : 'none',
      transition: 'border-color .15s, box-shadow .15s',
      ...style
    }
  }, props));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Label.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Label({
  children,
  style,
  ...props
}) {
  return /*#__PURE__*/React.createElement("label", _extends({
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: '0.8rem',
      fontWeight: 500,
      color: 'var(--text-primary)',
      display: 'block',
      marginBottom: 6,
      ...style
    }
  }, props), children);
}
Object.assign(__ds_scope, { Label });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Label.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select({
  options = [],
  value,
  onChange,
  placeholder = 'Select…',
  style,
  ...props
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("select", _extends({
    value: value,
    onChange: e => onChange?.(e.target.value),
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      height: 32,
      borderRadius: 'var(--radius-lg)',
      border: `1px solid ${focus ? 'var(--ring-color)' : 'var(--border-hairline)'}`,
      background: 'transparent',
      color: value ? 'var(--text-primary)' : 'var(--text-secondary)',
      padding: '0 8px',
      fontFamily: 'var(--font-sans)',
      fontSize: '0.875rem',
      outline: 'none',
      boxShadow: focus ? 'var(--focus-ring)' : 'none',
      transition: 'border-color .15s',
      ...style
    }
  }, props), /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true
  }, placeholder), options.map(opt => /*#__PURE__*/React.createElement("option", {
    key: opt.value,
    value: opt.value
  }, opt.label)));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Switch({
  checked,
  onChange,
  disabled,
  size = 'default',
  style,
  ...props
}) {
  const [isChecked, setIsChecked] = React.useState(!!checked);
  React.useEffect(() => setIsChecked(!!checked), [checked]);
  const toggle = () => {
    if (disabled) return;
    const next = !isChecked;
    setIsChecked(next);
    onChange?.(next);
  };
  const w = size === 'sm' ? 24 : 32;
  const h = size === 'sm' ? 14 : 18;
  const thumb = size === 'sm' ? 12 : 16;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: "switch",
    "aria-checked": isChecked,
    disabled: disabled,
    onClick: toggle,
    style: {
      width: w,
      height: h,
      borderRadius: 'var(--radius-full)',
      border: '1px solid transparent',
      background: isChecked ? 'var(--accent)' : 'var(--surface-muted)',
      position: 'relative',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      padding: 0,
      transition: 'background .15s',
      flexShrink: 0,
      ...style
    }
  }, props), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 1,
      left: isChecked ? w - thumb - 1 : 1,
      width: thumb,
      height: thumb,
      borderRadius: '50%',
      background: 'var(--surface-page)',
      transition: 'left .15s'
    }
  }));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Textarea({
  style,
  rows = 4,
  ...props
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("textarea", _extends({
    rows: rows,
    onFocus: e => {
      setFocus(true);
      props.onFocus?.(e);
    },
    onBlur: e => {
      setFocus(false);
      props.onBlur?.(e);
    },
    style: {
      width: '100%',
      boxSizing: 'border-box',
      resize: 'vertical',
      borderRadius: 'var(--radius-lg)',
      border: `1px solid ${focus ? 'var(--ring-color)' : 'var(--border-hairline)'}`,
      background: 'transparent',
      color: 'var(--text-primary)',
      padding: '8px 10px',
      fontFamily: 'var(--font-sans)',
      fontSize: '0.875rem',
      lineHeight: 1.5,
      outline: 'none',
      boxShadow: focus ? 'var(--focus-ring)' : 'none',
      transition: 'border-color .15s, box-shadow .15s',
      ...style
    }
  }, props));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function Tabs({
  tabs = [],
  value,
  onChange,
  children
}) {
  const [internal, setInternal] = React.useState(value ?? tabs[0]?.value);
  const active = value ?? internal;
  const set = v => {
    setInternal(v);
    onChange?.(v);
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      gap: 3,
      padding: 3,
      background: 'var(--surface-muted)',
      borderRadius: 'var(--radius-lg)'
    }
  }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.value,
    onClick: () => set(t.value),
    style: {
      border: 'none',
      cursor: 'pointer',
      padding: '5px 12px',
      borderRadius: 'var(--radius-md)',
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      fontWeight: 500,
      background: active === t.value ? 'var(--surface-page)' : 'transparent',
      color: active === t.value ? 'var(--text-primary)' : 'var(--text-secondary)',
      transition: 'all .15s'
    }
  }, t.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, typeof children === 'function' ? children(active) : children));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/overlays/Dialog.jsx
try { (() => {
function Dialog({
  open,
  onClose,
  title,
  children,
  footer
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(0,0,0,0.6)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 400,
      maxWidth: '90vw',
      background: 'var(--surface-card)',
      color: 'var(--text-primary)',
      borderRadius: 'var(--radius-2xl)',
      boxShadow: 'var(--ring-hairline), var(--shadow-overlay)',
      padding: 20,
      fontFamily: 'var(--font-sans)',
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 600
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: 'var(--text-secondary)'
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 8
    }
  }, footer)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/overlays/Tooltip.jsx
try { (() => {
function Tooltip({
  content,
  children,
  side = 'top'
}) {
  const [open, setOpen] = React.useState(false);
  const pos = {
    top: {
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: 6
    },
    bottom: {
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginTop: 6
    }
  }[side] || {};
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    },
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false)
  }, children, open && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      ...pos,
      whiteSpace: 'nowrap',
      background: 'var(--surface-card)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      padding: '5px 9px',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--ring-hairline), var(--shadow-overlay)',
      zIndex: 50,
      pointerEvents: 'none'
    }
  }, content));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/Tooltip.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app-dashboard/app-shell.js
try { (() => {
window.AppShell = function AppShell({
  ds,
  screen,
  setScreen
}) {
  const e = React.createElement;
  const {
    Avatar
  } = ds;
  const nav = [{
    group: 'Main',
    items: [{
      label: 'Dashboard',
      icon: 'layout-dashboard',
      screen: 'dashboard'
    }, {
      label: 'Shop',
      icon: 'shopping-bag'
    }, {
      label: 'Coaching Eye',
      icon: 'video'
    }]
  }, {
    group: 'Coaching Tools',
    items: [{
      label: 'Drill Library',
      icon: 'book-open',
      screen: 'drills'
    }, {
      label: 'Drill Designer',
      icon: 'pen-tool'
    }, {
      label: 'Session Planner',
      icon: 'calendar-days'
    }, {
      label: 'Weekly Focus',
      icon: 'target'
    }]
  }, {
    group: 'Analysis & Development',
    items: [{
      label: 'Match Reviews',
      icon: 'clipboard-check'
    }, {
      label: 'Match Analysis',
      icon: 'trending-up'
    }]
  }, {
    group: 'Community',
    items: [{
      label: 'Coach Chat',
      icon: 'message-square'
    }, {
      label: 'My Club',
      icon: 'building-2'
    }, {
      label: 'My Groups',
      icon: 'users-2'
    }]
  }];
  const header = e('div', {
    style: {
      padding: '14px 16px',
      borderBottom: '1px solid var(--border-hairline)',
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, e('img', {
    src: '../../assets/logo.png',
    style: {
      height: 30
    }
  }), e('div', null, e('p', {
    style: {
      margin: 0,
      fontWeight: 700,
      fontSize: 13,
      letterSpacing: '0.02em'
    }
  }, '18TH MAN'), e('p', {
    style: {
      margin: 0,
      fontSize: 10,
      color: 'var(--text-secondary)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase'
    }
  }, 'Rugby League')));
  const navGroups = nav.map(function (g) {
    const label = e('div', {
      style: {
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        padding: '4px 8px',
        textTransform: 'uppercase',
        letterSpacing: '0.04em'
      }
    }, g.group);
    const items = g.items.map(function (it) {
      const icon = e('i', {
        'data-lucide': it.icon,
        style: {
          width: 15,
          height: 15
        }
      });
      const btnStyle = {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 8px',
        borderRadius: 'var(--radius-md)',
        border: 'none',
        background: screen === it.screen ? 'var(--surface-muted)' : 'transparent',
        color: screen === it.screen ? 'var(--accent)' : 'var(--text-primary)',
        fontSize: 13,
        cursor: 'pointer',
        textAlign: 'left'
      };
      return e('button', {
        key: it.label,
        onClick: function () {
          if (it.screen) setScreen(it.screen);
        },
        style: btnStyle
      }, icon, it.label);
    });
    return e('div', {
      key: g.group,
      style: {
        marginBottom: 14
      }
    }, label, items);
  });
  const navContainer = e('div', {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '10px 8px'
    }
  }, navGroups);
  const footer = e('div', {
    style: {
      borderTop: '1px solid var(--border-hairline)',
      padding: '10px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, e(Avatar, {
    name: 'Nick Johnson',
    size: 'sm'
  }), e('span', {
    style: {
      fontSize: 12,
      fontWeight: 500
    }
  }, 'Nick Johnson'));
  const sidebar = e('div', {
    style: {
      width: 232,
      flexShrink: 0,
      background: 'var(--surface-sidebar)',
      borderRight: '1px solid var(--border-hairline)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, header, navContainer, footer);
  const main = e('div', {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: 28
    }
  }, screen === 'dashboard' ? renderDashboard(e, ds) : renderDrills(e, ds));
  return e('div', {
    style: {
      display: 'flex',
      height: '100%',
      fontFamily: 'var(--font-sans)',
      background: 'var(--surface-page)',
      color: 'var(--text-primary)'
    }
  }, sidebar, main);
};
function renderDashboard(e, ds) {
  const {
    Button,
    Badge
  } = ds;
  const actions = [{
    icon: 'pen-tool',
    label: 'New Drill',
    desc: 'Design on canvas'
  }, {
    icon: 'calendar-days',
    label: 'New Session',
    desc: 'Plan training'
  }, {
    icon: 'sparkles',
    label: 'Ask AI Coach',
    desc: 'Get instant advice'
  }, {
    icon: 'message-square',
    label: 'Community',
    desc: 'Join discussions'
  }];
  const stats = [{
    label: 'Drills created',
    value: 12
  }, {
    label: 'Sessions planned',
    value: 8
  }, {
    label: 'Messages sent',
    value: 34
  }, {
    label: 'Drills saved',
    value: 21
  }];
  return e('div', null, e('h1', {
    className: 'app-heading',
    style: {
      fontSize: 28,
      margin: '0 0 20px'
    }
  }, 'Dashboard'), e('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 12,
      marginBottom: 24
    }
  }, actions.map(a => e('div', {
    key: a.label,
    style: {
      padding: 16,
      borderRadius: 'var(--radius-xl)',
      border: '1px solid var(--border-hairline)',
      background: 'var(--surface-card)',
      cursor: 'pointer'
    }
  }, e('i', {
    'data-lucide': a.icon,
    style: {
      width: 20,
      height: 20,
      color: 'var(--accent)'
    }
  }), e('p', {
    style: {
      margin: '10px 0 2px',
      fontSize: 14,
      fontWeight: 600
    }
  }, a.label), e('p', {
    style: {
      margin: 0,
      fontSize: 12,
      color: 'var(--text-secondary)'
    }
  }, a.desc)))), e('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 12
    }
  }, stats.map(s => e('div', {
    key: s.label,
    style: {
      padding: 18,
      borderRadius: 'var(--radius-xl)',
      border: '1px solid var(--border-hairline)',
      background: 'var(--surface-card)'
    }
  }, e('p', {
    style: {
      margin: 0,
      fontSize: 26,
      fontWeight: 700,
      fontFamily: 'var(--font-mono)',
      color: 'var(--accent)'
    }
  }, s.value), e('p', {
    style: {
      margin: '4px 0 0',
      fontSize: 12,
      color: 'var(--text-secondary)'
    }
  }, s.label)))));
}
function renderDrills(e, ds) {
  const {
    Badge
  } = ds;
  const drills = [{
    title: 'Line Speed — Attack vs Defence',
    cat: 'Defence',
    diff: 'intermediate',
    players: 6
  }, {
    title: 'Ruck Speed Ball Presentation',
    cat: 'Completions',
    diff: 'beginner',
    players: 4
  }, {
    title: 'Wide Edge Overlap',
    cat: 'Attack',
    diff: 'advanced',
    players: 8
  }, {
    title: 'Tackle Technique — Chop',
    cat: 'Skills',
    diff: 'beginner',
    players: 2
  }];
  const diffColour = {
    beginner: '#4ade80',
    intermediate: '#eab308',
    advanced: '#ef4444'
  };
  return e('div', null, e('h1', {
    className: 'app-heading',
    style: {
      fontSize: 28,
      margin: '0 0 20px'
    }
  }, 'Drill Library'), e('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2,1fr)',
      gap: 16
    }
  }, drills.map(d => e('div', {
    key: d.title,
    style: {
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      background: 'var(--surface-card)',
      boxShadow: 'var(--ring-hairline)'
    }
  }, e('div', {
    style: {
      aspectRatio: '16/9',
      background: 'var(--surface-muted)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 32,
      opacity: 0.3
    }
  }, '\uD83C\uDFC9'), e('div', {
    style: {
      padding: 14
    }
  }, e('p', {
    style: {
      margin: '0 0 8px',
      fontWeight: 600,
      fontSize: 14
    }
  }, d.title), e('div', {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 10
    }
  }, e(Badge, {
    variant: 'secondary'
  }, d.cat), e(Badge, {
    style: {
      background: diffColour[d.diff] + '22',
      color: diffColour[d.diff]
    }
  }, d.diff)), e('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 12,
      color: 'var(--text-secondary)'
    }
  }, e('i', {
    'data-lucide': 'users',
    style: {
      width: 12,
      height: 12
    }
  }), d.players + ' players'))))));
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app-dashboard/app-shell.js", error: String((e && e.message) || e) }); }

// ui_kits/marketing-website/MarketingHome.jsx
try { (() => {
window.MarketingHome = function MarketingHome({
  signedIn,
  onNav
}) {
  const e = React.createElement;
  const HexIcon = ({
    d,
    filled
  }) => e('div', {
    style: {
      width: 40,
      height: 40,
      flexShrink: 0
    }
  }, e('svg', {
    viewBox: '0 0 48 48',
    fill: 'none'
  }, e('path', {
    d: 'M12 2L36 2L48 24L36 46L12 46L0 24Z',
    fill: 'rgba(232,86,10,0.15)',
    stroke: 'rgba(232,86,10,0.4)',
    strokeWidth: 1.5
  }), e('g', {
    transform: 'translate(12,12)',
    stroke: filled ? 'none' : 'rgba(232,86,10,0.95)',
    fill: filled ? 'rgba(232,86,10,0.95)' : 'none',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  }, e('path', {
    d
  }))));
  const features = [{
    d: 'M8 6V4m8 2V4M3 9h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
    title: 'Coaching Blocks',
    body: "Name your block, choose how many sessions, and AI plans every single one upfront — balanced across Attack, Defence, Completions, and Skills. The whole season, sorted before it starts."
  }, {
    d: 'M13 2L4.5 13.5H11L9.5 22L19.5 10.5H13L13 2Z',
    filled: true,
    title: 'AI Coaching Suite',
    body: 'Three specialist AI coaches in one platform. The Coaching Assistant handles drills, tactics, and session planning. The S&C Coach covers conditioning and gym programs. GameSense builds your entire season structure.'
  }, {
    d: 'M15.232 5.232l3.536 3.536M16.5 3.5a2.121 2.121 0 113 3L7.5 18.5H4v-3.5L16.5 3.5z',
    title: 'Drill Designer',
    body: 'Draw drills on a digital canvas exactly as you would on a whiteboard — players, cones, arrows, zones. Build your private library and share with the community.'
  }];
  const marquee = ['Design drills on a digital canvas', 'AI-planned coaching blocks, every session covered', 'Weekly coaching focus with community discussion', 'Club groups with private content', 'Game Sense session structure built in', 'S&C and AI coaching assistant', 'Player wellbeing tracking', 'Match Analyst desktop app'];
  return e('div', {
    style: {
      fontFamily: 'var(--font-serif-editorial)',
      background: 'var(--lp-bg)',
      color: 'var(--lp-text)',
      minHeight: '100%'
    }
  },
  // nav
  e('nav', {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 10,
      borderBottom: '1px solid var(--lp-border)',
      background: 'rgba(7,8,13,0.88)',
      backdropFilter: 'blur(12px)'
    }
  }, e('div', {
    style: {
      maxWidth: 1100,
      margin: '0 auto',
      height: 64,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px'
    }
  }, e('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, e('img', {
    src: '../../assets/logo.png',
    style: {
      height: 32
    }
  }), e('span', {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 19,
      letterSpacing: '0.04em'
    }
  }, '18TH MAN')), e('div', {
    style: {
      display: 'flex',
      gap: 28,
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 13,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--lp-text-muted)'
    }
  }, ['Features', 'How It Works', 'Community', 'Pricing'].map(l => e('span', {
    key: l
  }, l))), e('button', {
    onClick: () => onNav('app'),
    style: {
      background: 'var(--brand-orange)',
      color: '#fff',
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 13,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      padding: '10px 20px',
      borderRadius: 4,
      border: 'none',
      cursor: 'pointer'
    }
  }, signedIn ? 'Go to App →' : 'Get Started Free'))),
  // hero
  e('section', {
    style: {
      position: 'relative',
      padding: '90px 24px 70px',
      maxWidth: 1100,
      margin: '0 auto'
    }
  }, e('span', {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 12,
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color: 'var(--brand-orange)'
    }
  }, 'Rugby League Coaching Platform'), e('h1', {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontStyle: 'italic',
      fontSize: 'clamp(2.6rem,6vw,5rem)',
      lineHeight: 0.92,
      letterSpacing: '-0.02em',
      textTransform: 'uppercase',
      margin: '20px 0'
    }
  }, e('span', {
    style: {
      display: 'block',
      color: 'var(--brand-orange)'
    }
  }, 'Better sessions.'), e('span', {
    style: {
      display: 'block'
    }
  }, 'Better players.')), e('p', {
    style: {
      fontSize: 18,
      lineHeight: 1.65,
      color: 'var(--lp-text-muted)',
      maxWidth: 460,
      fontWeight: 300,
      marginBottom: 28
    }
  }, 'Stop winging it on the whiteboard. 18th Man gives rugby league coaches ready-made drills, AI-planned session blocks, and a community sharing what actually works at training.'), e('div', {
    style: {
      display: 'flex',
      gap: 12
    }
  }, e('button', {
    onClick: () => onNav('app'),
    style: {
      background: 'var(--brand-orange)',
      color: '#fff',
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 15,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      padding: '14px 30px',
      borderRadius: 4,
      border: 'none',
      cursor: 'pointer'
    }
  }, 'Start Coaching Better →'), e('button', {
    style: {
      background: 'transparent',
      color: 'var(--lp-text)',
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 15,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      padding: '14px 26px',
      borderRadius: 4,
      border: '1px solid rgba(255,255,255,0.14)',
      cursor: 'pointer'
    }
  }, 'Sign In')), e('p', {
    style: {
      marginTop: 14,
      fontSize: 13,
      color: 'var(--lp-text-dim)'
    }
  }, 'Free to join · No credit card required · Set up in 2 minutes')),
  // marquee
  e('div', {
    style: {
      borderTop: '1px solid rgba(232,86,10,0.2)',
      borderBottom: '1px solid rgba(232,86,10,0.2)',
      background: '#0a0806',
      padding: '14px 0',
      overflow: 'hidden',
      whiteSpace: 'nowrap'
    }
  }, e('div', {
    style: {
      display: 'inline-flex',
      gap: '2.5rem'
    }
  }, marquee.map((m, i) => e('span', {
    key: i,
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontStyle: 'italic',
      fontSize: 13,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: '#9a9590'
    }
  }, '◆ ' + m)))),
  // quote
  e('section', {
    style: {
      padding: '60px 24px',
      maxWidth: 1100,
      margin: '0 auto'
    }
  }, e('div', {
    style: {
      background: 'var(--lp-surface)',
      border: '1px solid var(--lp-border)',
      borderRadius: 16,
      padding: 40
    }
  }, e('p', {
    style: {
      fontSize: 20,
      lineHeight: 1.7,
      fontWeight: 300,
      fontStyle: 'italic',
      margin: 0
    }
  }, '"I built 18th Man because I was coaching at the grassroots level and couldn\u2019t find tools that spoke the language of rugby league. The drills, the sets, the defensive structures — everything coaches actually talk about on the training field."'), e('p', {
    style: {
      marginTop: 20,
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      textTransform: 'uppercase',
      fontSize: 15
    }
  }, 'Nick Johnson'), e('p', {
    style: {
      color: 'var(--brand-orange)',
      fontFamily: 'var(--font-display)',
      fontSize: 12,
      letterSpacing: '0.1em',
      textTransform: 'uppercase'
    }
  }, 'Creator of 18th Man'))),
  // features
  e('section', {
    style: {
      padding: '60px 24px 90px',
      maxWidth: 1100,
      margin: '0 auto'
    }
  }, e('h2', {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontStyle: 'italic',
      textTransform: 'uppercase',
      fontSize: 'clamp(2rem,4vw,3rem)',
      lineHeight: 0.95,
      marginBottom: 40
    }
  }, 'Built for ', e('span', {
    style: {
      color: 'var(--brand-orange)'
    }
  }, 'serious coaches.')), e('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
      gap: 24
    }
  }, features.map(f => e('div', {
    key: f.title,
    style: {
      background: 'var(--lp-surface-2)',
      border: '1px solid var(--lp-border)',
      borderRadius: 12,
      padding: 28
    }
  }, e(HexIcon, {
    d: f.d,
    filled: f.filled
  }), e('h3', {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 22,
      textTransform: 'uppercase',
      margin: '16px 0 10px'
    }
  }, f.title), e('p', {
    style: {
      fontSize: 15,
      lineHeight: 1.7,
      color: 'var(--lp-text-muted)',
      fontWeight: 300,
      margin: 0
    }
  }, f.body))))));
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-website/MarketingHome.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.CardHeader = __ds_scope.CardHeader;

__ds_ns.CardTitle = __ds_scope.CardTitle;

__ds_ns.CardDescription = __ds_scope.CardDescription;

__ds_ns.CardContent = __ds_scope.CardContent;

__ds_ns.CardFooter = __ds_scope.CardFooter;

__ds_ns.Separator = __ds_scope.Separator;

__ds_ns.Skeleton = __ds_scope.Skeleton;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Label = __ds_scope.Label;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Tooltip = __ds_scope.Tooltip;

})();
