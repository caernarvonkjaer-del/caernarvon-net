// Milestone 73A: every signature block a PDF model builds is resolved here to
// the one way it prints -- 'blank' (a line to sign by hand), 'typed' ("/s/
// Name" and the Rule 2.515 caption) or 'stamp' -- from its signer's role and
// the year's signature policy (signature-state.js's signaturePrintMode()). The
// engine draws exactly that and infers nothing.
//
// It used to infer: anything but an applied stamp printed "/s/ Name" with the
// electronic-signature caption, so an Unsigned block, a stamp never applied
// and a block with no name all looked signed (the QA finding, on all nine
// forms). A block without `signerRole` fails loudly here rather than print as
// someone it isn't.
import { SIGNER_ROLES, signaturePolicyOf, signaturePrintMode } from '../validation/signature-state.js';

const ROLES = new Set(Object.values(SIGNER_ROLES));

function resolveBlocks(blocks, policy) {
  for (const block of Array.isArray(blocks) ? blocks : []) {
    if (!block || typeof block !== 'object') continue;
    if (block.type === 'signature-block') {
      if (!ROLES.has(block.signerRole)) throw new Error(`The signature block "${block.role || ''}" names no signer role (guardian, attorney or preparer)`);
      block.signatureMode = signaturePrintMode({
        state: block.signatureState, date: block.signatureDate, image: block.signatureImage, name: block.signerName, role: block.signerRole, policy,
      });
    }
    if (Array.isArray(block.blocks)) resolveBlocks(block.blocks, policy);
    if (Array.isArray(block.children)) resolveBlocks(block.children, policy);
  }
}

/**
 * Sets each signature block's `signatureMode`, for the filing `d`. Returns the
 * model.
 * @template {{ sections?: any[] }} M
 * @param {M} model
 * @param {Record<string, any>} d
 * @returns {M}
 */
export function resolveSignatureModes(model, d) {
  const policy = signaturePolicyOf(d);
  for (const section of model?.sections || []) resolveBlocks(section?.blocks, policy);
  return model;
}
