// Milestone 70, 70G: the filing lifecycle service. Everything that creates,
// opens, switches, closes, deletes or converts a filing, carries one into
// another, or starts, switches or deletes one of its years goes through this
// one object -- the UI's dispatchers and dialogs, and the test adapter. Each
// member is the implementation itself (ward-lifecycle.js and the workflow
// modules beside it), not a copy; tests/unit/filing-lifecycle.spec.js holds
// that. There is no rename: a filing's name is an ordinary field of the filing
// (the Rename Ward dialog, unreachable, went in 70B).
//
// Its own module rather than a member of ward-lifecycle.js: conversion and the
// year operations import ward-lifecycle.js, so the facade there would close an
// import cycle.
import { addWard, activateWard, switchWard, unloadWard, deleteWard } from './ward-lifecycle.js';
import { carryOverFields } from '../filing/carry-over.js';
import { convertExistingWard } from '../filing/conversion.js';
import { startNewWardYear, switchWardYear, deleteWardYear } from '../filing/filing-years.js';

export const filingLifecycle = Object.freeze({
  /** A new, blank filing of a type, opened: its id. */
  create: addWard,
  /** Open a filing (the ward object): false when another tab holds its lock. */
  open: activateWard,
  /** Open a filing by id at its Cover: false when another tab holds its lock. */
  switchTo: switchWard,
  /** Close the open filing and go to the dashboard. */
  unload: unloadWard,
  /** Delete a filing. */
  remove: deleteWard,
  /** A new filing of another type made from an existing one. */
  convert: convertExistingWard,
  /** What a new filing of a type carries over from an existing one. */
  carry: carryOverFields,
  /** Archive the open year and start the next. */
  newYear: startNewWardYear,
  /** Open one of a filing's years. */
  switchYear: switchWardYear,
  /** Delete one of a filing's archived years. */
  removeYear: deleteWardYear,
});
