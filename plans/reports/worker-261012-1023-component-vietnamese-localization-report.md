Status: DONE
Summary: Localized shared components with live language hooks and Vietnamese catalog, retaining design, English defaults and user data.

Coverage: navigation, dormant auth notice, calendar weekday/view controls, entity fields, account setup, composer preview and placeholders, post filters/table/details, schedule history, strategy and distribution notices, accessible labels, shared dialog/toast errors. Input native required/range/invalid validation and EntityForm selects use Vietnamese custom validity only when Vietnamese is selected; English native validation remains browser-owned.

Validation: component ESLint passed; project typecheck passed; six native validation cases plus user-title interpolation passed. No background process started. Browser integration belongs to controller validation.

Limit: browser/OS native date picker chrome follows browser settings and cannot reliably be switched through page lang.
Unresolved questions: none.
