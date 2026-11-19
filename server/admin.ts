// Invictos admin commands, run from a terminal:  npm run admin -- <command> [options]
// Nothing here sends email or messages: setup codes are printed on screen only.
import { issueSetupCode } from './auth';
import { netsuite } from './netsuite';
import { findClinicByName, load, newClinic, update } from './store';

const [command, ...rest] = process.argv.slice(2);
const opts: Record<string, string> = {};
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith('--')) opts[rest[i].slice(2)] = rest[i + 1] ?? '';
}

const HELP = `
Invictos clinic app — admin commands

  npm run admin -- list
      Show all clinics and whether they have finished setup.

  npm run admin -- add-clinic --name "Clinic Name" --customer 511
      Add a clinic linked to a NetSuite customer id and print its one-time setup code.

  npm run admin -- new-code --name "Clinic Name"
      Print a fresh setup code (for a forgotten password). The clinic sets a new password with it.

  npm run admin -- import-items --name "Clinic Name"
      Add every item the clinic ordered in the last 12 months to its shelf list.

  npm run admin -- add-item --name "Clinic Name" --item 002716 [--par 10] [--on-hand 10] [--loc "Bin A2"]
  npm run admin -- set-stock --name "Clinic Name" --item 002716 [--par 10] [--on-hand 4] [--loc "Bin A2"]
  npm run admin -- remove-item --name "Clinic Name" --item 002716
  npm run admin -- remove-clinic --name "Clinic Name"

Setup codes are shown here only. Nothing is emailed. Codes work once and expire after 14 days.
`;

function need(key: string) {
  if (!opts[key]) {
    console.error('Missing --' + key + '\n' + HELP);
    process.exit(1);
  }
  return opts[key];
}

function clinicOrExit(name: string) {
  const c = findClinicByName(load(), name);
  if (!c) {
    console.error('No clinic called "' + name + '". Run: npm run admin -- list');
    process.exit(1);
  }
  return c;
}

function printCode(name: string, code: string) {
  console.log('\n  Clinic name:  ' + name);
  console.log('  Setup code:   ' + code + '   (one use, expires in 14 days)\n');
  console.log('  Give these to the clinic yourself. Nothing has been emailed.');
  console.log('  They open the app, choose "First time? Use a setup code", and pick their own password.\n');
}

const num = (key: string, fallback: number) => (opts[key] !== undefined ? Math.max(0, Math.round(Number(opts[key]))) : fallback);

async function main() {
  switch (command) {
    case 'list': {
      const data = load();
      if (!data.clinics.length) return console.log('No clinics yet. Add one with add-clinic.');
      for (const c of data.clinics) {
        const items = Object.keys(data.shelf[c.id] ?? {}).length;
        const state = c.passwordHash ? 'set up' : c.setupCode ? 'waiting for setup code' : 'no code issued';
        console.log('- ' + c.name + '  (NetSuite customer ' + c.netsuiteCustomerId + ', ' + items + ' items, ' + state + ')');
      }
      return;
    }

    case 'add-clinic': {
      const name = need('name');
      const customerId = Number(need('customer'));
      if (!Number.isInteger(customerId)) throw new Error('--customer must be the NetSuite customer internal id (a number).');
      const customer = await netsuite().getCustomer(customerId);
      if (!customer) throw new Error('NetSuite customer ' + customerId + ' was not found.');
      console.log('NetSuite customer ' + customerId + ': ' + customer.name +
        ' · terms ' + (customer.terms ?? 'none') + ' · price level ' + (customer.priceLevel ?? 'none'));
      const code = update(data => {
        if (findClinicByName(data, name)) throw new Error('A clinic called "' + name + '" already exists.');
        const clinic = newClinic(name, customerId);
        data.clinics.push(clinic);
        return issueSetupCode(clinic);
      });
      printCode(name, code);
      console.log('  Next: npm run admin -- import-items --name "' + name + '"\n');
      return;
    }

    case 'new-code': {
      const name = need('name');
      clinicOrExit(name);
      const code = update(data => issueSetupCode(findClinicByName(data, name)!));
      printCode(name, code);
      return;
    }

    case 'import-items': {
      const clinic = clinicOrExit(need('name'));
      const recent = await netsuite().recentItems(clinic.netsuiteCustomerId);
      const added = update(data => {
        const shelf = (data.shelf[clinic.id] ??= {});
        let n = 0;
        for (const { item, maxQty } of recent) {
          if (shelf[item.id]) continue;
          // Starting guess: par = largest single order in the last year, shelf full. Adjust with set-stock.
          shelf[item.id] = { par: maxQty, onHand: maxQty, loc: '' };
          n++;
        }
        return n;
      });
      console.log('Added ' + added + ' items (' + (recent.length - added) + ' were already on the list).');
      console.log('Par levels start at the largest single order in the last year, with the shelf assumed full. Adjust with set-stock.');
      return;
    }

    case 'add-item':
    case 'set-stock': {
      const clinic = clinicOrExit(need('name'));
      const item = await netsuite().findItem(need('item'));
      if (!item) throw new Error('Item ' + opts.item + ' was not found in NetSuite.');
      update(data => {
        const shelf = (data.shelf[clinic.id] ??= {});
        const cur = shelf[item.id];
        if (command === 'set-stock' && !cur) throw new Error('Item ' + item.itemNumber + ' is not on this clinic’s list. Use add-item.');
        shelf[item.id] = {
          par: num('par', cur?.par ?? 1),
          onHand: num('on-hand', cur?.onHand ?? num('par', 1)),
          loc: opts.loc ?? cur?.loc ?? '',
        };
        console.log(item.itemNumber + ' ' + item.name + ': on hand ' + shelf[item.id].onHand + ', par ' + shelf[item.id].par);
      });
      return;
    }

    case 'remove-item': {
      const clinic = clinicOrExit(need('name'));
      const item = await netsuite().findItem(need('item'));
      if (!item) throw new Error('Item ' + opts.item + ' was not found in NetSuite.');
      update(data => { delete data.shelf[clinic.id]?.[item.id]; });
      console.log('Removed ' + item.itemNumber + '.');
      return;
    }

    case 'remove-clinic': {
      const clinic = clinicOrExit(need('name'));
      update(data => {
        data.clinics = data.clinics.filter(c => c.id !== clinic.id);
        delete data.shelf[clinic.id];
        delete data.usage[clinic.id];
        for (const [k, s] of Object.entries(data.sessions)) if (s.clinicId === clinic.id) delete data.sessions[k];
      });
      console.log('Removed ' + clinic.name + '.');
      return;
    }

    default:
      console.log(HELP);
  }
}

main().catch(err => {
  console.error('Error: ' + (err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
