// Milestone 68E (shared with 68F). A checkbox list whose options include a
// "None" must not let a filer tick "None" beside a real selection -- a filed
// plan would then state both. The court's forms offer "None" as one box among
// the others (Initial Plan question 4; questions 10D and 10E's assistive
// devices), which implies it is exclusive; the app had no rule at all.
//
// The rule rides on two data attributes the checkbox renderer emits:
//   data-exclusive-group="<group>"  every box in the list
//   data-exclusive-role="none"      the "None" box; every other box is "member"
// form-events.js calls applyExclusiveChoice() after the changed box has been
// written, before any route re-render: ticking "None" clears every member
// (DOM and model); ticking a member clears "None". Unticking clears nothing.
export function applyExclusiveChoice(filing, control, root) {
  const group = control?.dataset?.exclusiveGroup;
  if (!group || !control.checked) return [];
  const role = control.dataset.exclusiveRole || 'member';
  const scope = root || (typeof document !== 'undefined' ? document : null);
  if (!scope) return [];
  const cleared = [];
  scope.querySelectorAll('input[type="checkbox"][data-exclusive-group]').forEach((el) => {
    if (el === control || el.dataset.exclusiveGroup !== group) return;
    if ((el.dataset.exclusiveRole || 'member') === role) return;
    el.checked = false;
    const path = el.dataset.formPath;
    if (path && filing && typeof window !== 'undefined' && typeof window.setPath === 'function') {
      window.setPath(filing, path, false);
      cleared.push(path);
    }
  });
  return cleared;
}
