'use strict';

// This endpoint and these column positions match the unmodified Breeze export.
// Keep them in sync with the Google Apps Script and spreadsheet workflow.
const csvUrl = 'https://script.google.com/macros/s/AKfycbyLX9i8jJY_fcGoyFwell6QJJYpnYQ9PuJutljgYwaEos8GMkhE8XEmc8gZIV_ka-02/exec';
const COL = Object.freeze({
  ID: 0, FIRST: 1, LAST: 2, GENDER: 7, STATUS: 8, SINCE: 9,
  FAM_ID: 15, ROLE: 16, SHOW: 17, SHOW_EMAIL: 18, SHOW_PHONE: 19,
  PHONE: 24, EMAIL: 29, PHOTO: 34
});

const FALLBACK_PHOTO = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 350"><rect width="300" height="350" fill="#e8f0ee"/><circle cx="150" cy="125" r="55" fill="#a9bfbb"/><path d="M50 330c9-82 48-123 100-123s91 41 100 123" fill="#a9bfbb"/></svg>'
);

let members = [];
let activeLetter = 'All';
let lastFocusedElement = null;

const directory = document.querySelector('#directory');
const status = document.querySelector('#status');
const searchInput = document.querySelector('#searchInput');
const alphabetNav = document.querySelector('#alphabetNav');
const modalOverlay = document.querySelector('#modalOverlay');
const modal = modalOverlay.querySelector('.modal');
const modalBody = document.querySelector('#modalBody');
const closeButton = document.querySelector('#closeModal');

async function fetchDirectory() {
  try {
    const response = await fetch(csvUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Directory request failed (${response.status})`);

    const rows = parseCSV(await response.text());
    const seen = new Set();

    members = rows.slice(1)
      .filter(row => row.length > COL.PHOTO)
      .map(row => ({
        id: clean(row[COL.ID]),
        firstName: clean(row[COL.FIRST]),
        lastName: clean(row[COL.LAST]),
        fullName: `${clean(row[COL.FIRST])} ${clean(row[COL.LAST])}`.trim(),
        photo: clean(row[COL.PHOTO]),
        gender: clean(row[COL.GENDER]).toLowerCase(),
        role: clean(row[COL.ROLE]),
        familyId: clean(row[COL.FAM_ID]),
        show: isYes(row[COL.SHOW]),
        email: clean(row[COL.EMAIL]),
        phone: clean(row[COL.PHONE]),
        showEmail: isYes(row[COL.SHOW_EMAIL]),
        showPhone: isYes(row[COL.SHOW_PHONE]),
        memberSince: clean(row[COL.SINCE])
      }))
      .filter(member => {
        const key = member.fullName.toLocaleLowerCase();
        if (!member.show || !member.photo || member.photo.toLowerCase().includes('placeholder') || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));

    buildAlphabet();
    updateResults();
  } catch (error) {
    console.error(error);
    status.classList.add('is-error');
    status.replaceChildren(document.createTextNode('We couldn’t update the directory. Please refresh the page and try again.'));
  }
}

function clean(value) { return String(value ?? '').trim(); }
function isYes(value) { return clean(value).toLowerCase() === 'yes'; }

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(field.trim()); field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      if (field !== '' || row.length) { row.push(field.trim()); rows.push(row); row = []; field = ''; }
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length) { row.push(field.trim()); rows.push(row); }
  return rows;
}

function getFamily(member) {
  return member.familyId ? members.filter(person => person.familyId === member.familyId) : [];
}

function getRoleLabel(member) {
  const hasChildren = getFamily(member).some(person => person.role === 'Child');
  const adult = member.role === 'Head of Household' || member.role === 'Spouse';
  if (adult && member.gender === 'male') return hasChildren ? 'Husband / Father' : 'Husband';
  if (adult && member.gender === 'female') return hasChildren ? 'Wife / Mother' : 'Wife';
  return member.role || '';
}

function getParentNames(member) {
  if (member.role !== 'Child') return '';
  const parents = getFamily(member).filter(person =>
    person.id !== member.id && (person.role === 'Head of Household' || person.role === 'Spouse')
  );
  return parents.length ? `Child of ${parents.map(parent => parent.fullName).join(' and ')}` : '';
}

function buildAlphabet() {
  const available = new Set(members.map(member => member.lastName.charAt(0).toUpperCase()).filter(Boolean));
  const fragment = document.createDocumentFragment();
  ['All', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].forEach(letter => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'letter-button';
    button.textContent = letter;
    button.dataset.letter = letter;
    button.setAttribute('aria-pressed', String(letter === activeLetter));
    button.setAttribute('aria-label', letter === 'All' ? 'Show all last names' : `Show last names beginning with ${letter}`);
    button.disabled = letter !== 'All' && !available.has(letter);
    button.addEventListener('click', () => {
      activeLetter = letter;
      alphabetNav.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      updateResults();
    });
    fragment.append(button);
  });
  alphabetNav.replaceChildren(fragment);
}

function updateResults() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const filtered = members.filter(member => {
    const matchesSearch = member.fullName.toLocaleLowerCase().includes(query);
    const matchesLetter = activeLetter === 'All' || member.lastName.toUpperCase().startsWith(activeLetter);
    return matchesSearch && matchesLetter;
  });
  renderMembers(filtered);
  status.hidden = true;
}

function renderMembers(data) {
  if (!data.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No members match that search. Try another name or choose All.';
    directory.replaceChildren(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  data.forEach(member => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'member-card';
    card.setAttribute('aria-label', `View ${member.fullName}’s profile`);
    card.addEventListener('click', () => openModal(member.id));

    const photo = makePhoto(member.photo, member.fullName, 'card-photo');
    photo.loading = 'lazy';
    photo.decoding = 'async';

    const copy = document.createElement('div');
    copy.className = 'card-copy';
    const name = document.createElement('h2');
    name.textContent = member.fullName;
    copy.append(name);

    const relationship = getParentNames(member) || getRoleLabel(member);
    if (relationship) copy.append(textElement('p', 'card-meta', relationship));
    if (member.memberSince) copy.append(textElement('p', 'card-since', `Member since ${member.memberSince}`));
    card.append(photo, copy);
    fragment.append(card);
  });
  directory.replaceChildren(fragment);
}

function openModal(id) {
  const member = members.find(person => person.id === id);
  if (!member) return;
  lastFocusedElement = document.activeElement;
  renderProfile(member);
  modalOverlay.hidden = false;
  document.body.classList.add('modal-open');
  closeButton.focus();
}

function renderProfile(member) {
  const profile = document.createElement('div');
  profile.className = 'profile';
  profile.append(makePhoto(member.photo, member.fullName, 'profile-photo'));

  const info = document.createElement('div');
  const name = document.createElement('h2');
  name.id = 'profileName';
  name.className = 'profile-name';
  name.textContent = member.fullName;
  info.append(name);

  const role = getRoleLabel(member);
  if (role) info.append(textElement('p', 'profile-role', role));

  const actions = document.createElement('div');
  actions.className = 'contact-actions';
  if (member.showEmail && member.email) actions.append(contactLink(`Email ${member.fullName}`, member.email, `mailto:${member.email}`));
  if (member.showPhone && member.phone) actions.append(contactLink(`Call ${member.fullName}`, member.phone, `tel:${member.phone}`));
  if (actions.childElementCount) info.append(actions);
  if (member.memberSince) info.append(textElement('p', 'since-detail', `Member since ${member.memberSince}`));

  const family = getFamily(member).filter(person => person.id !== member.id);
  if (family.length) {
    const household = document.createElement('section');
    household.className = 'household';
    household.append(textElement('h3', '', 'Household'));
    family.forEach(person => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'family-member';
      button.addEventListener('click', () => renderProfile(person));
      const photo = makePhoto(person.photo, '', 'family-thumb');
      photo.alt = '';
      const details = document.createElement('span');
      details.append(textElement('span', 'family-name', person.fullName), textElement('span', 'family-role', getRoleLabel(person)));
      button.append(photo, details);
      household.append(button);
    });
    info.append(household);
  }
  profile.append(info);
  modalBody.replaceChildren(profile);
}

function closeModal() {
  if (modalOverlay.hidden) return;
  modalOverlay.hidden = true;
  document.body.classList.remove('modal-open');
  modalBody.replaceChildren();
  lastFocusedElement?.focus();
}

function makePhoto(src, name, className) {
  const image = document.createElement('img');
  image.className = className;
  image.src = src;
  image.alt = name ? `Photo of ${name}` : '';
  image.addEventListener('error', () => { if (image.src !== FALLBACK_PHOTO) image.src = FALLBACK_PHOTO; }, { once: true });
  return image;
}

function textElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function contactLink(label, text, href) {
  const link = document.createElement('a');
  link.className = 'contact-button';
  link.href = href;
  link.setAttribute('aria-label', label);
  link.textContent = text;
  return link;
}

searchInput.addEventListener('input', updateResults);
closeButton.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', event => { if (event.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeModal();
  if (event.key === 'Tab' && !modalOverlay.hidden) {
    const focusable = [...modal.querySelectorAll('button, a[href], input, [tabindex]:not([tabindex="-1"])')].filter(item => !item.disabled);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

fetchDirectory();
