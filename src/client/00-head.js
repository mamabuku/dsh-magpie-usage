/**
 * dsh-magpie-usage — browser half (classic script for the DSH module loader).
 *
 * Mirrors Magpie's own 「观测 / 用量 / 概览」 page: a period bar, a totals line,
 * then quota cards grouped by provider — each account shows its windows with
 * remaining bars, reset countdown, whole-window estimate and a remaining-quota
 * sparkline. Only data Magpie already serves is used; nothing is fetched from a
 * vendor and nothing is written.
 *
 * Styling uses only --dsw-* tokens, so light/dark and host theming are free.
 */
window.__ModuleLoader__.load({
  id: 'dsh-magpie-usage',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    