// Milestone 70, 70H: the guardian's own name and email, asked once. Moved
// from legacy-app.js's MODAL FUNCTIONS.
import { updateSidebar } from '../shell/sidebar.js';
import { getCaseFile } from '../state.js';
import { alertModal, closeModal } from '../ui/dialogs.js';
import { markDirtySinceExport, saveData } from '../persistence/case-file.js';

export async function doGuardianSetup(){
  const name=document.getElementById('setup-guardian-name').value.trim();
  if(!name){await alertModal('Please enter your name');return;}
  getCaseFile().guardianName=name;
  getCaseFile().guardianEmail=document.getElementById('setup-guardian-email').value.trim();
  // A change: a save writes only a case with changes (Milestone 76A).
  markDirtySinceExport();
  await saveData();
  updateSidebar();
  closeModal('guardianSetupModal');
}
