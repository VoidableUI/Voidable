// SPDX-License-Identifier: MIT
//
// React 19 app for specs/react.spec.ts, built against @voidable/ui-react's
// dist. Every piece of state has a setter on window.api so a test can play
// the part of the application, and every wrapper event is logged to
// window.events.
import { StrictMode, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import {
  Button,
  Checkbox,
  Dialog,
  DropdownMenu,
  DropdownMenuItem,
  Input,
  Radio,
  RadioGroup,
  Select,
  Switch,
  TabPanel,
  Tabs,
  Textarea,
} from '@voidable/ui-react';

declare global {
  interface Window {
    api: Record<string, (v: any) => void>;
    events: string[];
    submits: [string, string][][];
    mount: (strict?: boolean) => void;
    unmount: () => void;
  }
}

window.api = {};
window.events = [];
window.submits = [];

function App() {
  const [name, setName] = useState('init');
  const [bio, setBio] = useState('hello');
  const [agree, setAgree] = useState(false);
  const [on, setOn] = useState(true);
  const [country, setCountry] = useState('b');
  const [opts, setOpts] = useState(['a', 'b', 'c']);
  const [plan, setPlan] = useState('free');
  const [open, setOpen] = useState(false);
  const [dlgItems, setDlgItems] = useState(['one']);
  const [tabs, setTabs] = useState(['x', 'y', 'z']);
  const [tab, setTab] = useState('x');
  const [label, setLabel] = useState('v1');
  const [disabled, setDisabled] = useState(false);
  Object.assign(window.api, { setName, setBio, setAgree, setOn, setCountry, setOpts, setPlan, setOpen, setDlgItems, setTabs, setTab, setLabel, setDisabled });
  const log = (n: string, f?: (e: any) => void) => (e: any) => {
    window.events.push(`${n}:${JSON.stringify(e.detail ?? null, (_k, v) => (v instanceof Element ? v.tagName.toLowerCase() : v))}`);
    f?.(e);
  };

  return (
    <form
      id="rf"
      onSubmit={(e) => {
        e.preventDefault();
        window.submits.push([...new FormData(e.currentTarget)].map(([k, v]) => [k, String(v)]));
      }}
    >
      <Input id="r-name" name="name" aria-label="Name" value={name} disabled={disabled} onVoidInput={log('input', (e) => setName(e.detail.value))} />
      <Textarea id="r-bio" name="bio" aria-label="Bio" value={bio} onVoidInput={(e: any) => setBio(e.detail.value)} />
      <Checkbox id="r-agree" name="agree" checked={agree} onVoidChange={log('agree', (e) => setAgree(e.detail.checked))}>
        Agree
      </Checkbox>
      <Switch id="r-on" name="on" checked={on} onVoidChange={log('on', (e) => setOn(e.detail.checked))}>
        On
      </Switch>
      <Select id="r-country" name="country" aria-label="Country" value={country} onVoidChange={log('country', (e) => setCountry(e.detail.value))}>
        {opts.map((o) => (
          <option key={o} value={o}>
            Opt {o}
          </option>
        ))}
      </Select>
      <RadioGroup id="r-plan" name="plan" label="Plan" value={plan} onVoidChange={log('plan', (e) => setPlan(e.detail.value))}>
        <Radio value="free">Free</Radio>
        <Radio value="pro">Pro</Radio>
      </RadioGroup>
      <Button id="r-submit" type="submit" disabled={disabled} onVoidClick={log('click')}>
        Save {label}
      </Button>
      <Dialog id="r-dlg" open={open} heading={`Dialog ${dlgItems.length}`} onVoidClose={log('close', () => setOpen(false))}>
        {dlgItems.map((i) => (
          <p key={i} className="di">
            {i}
          </p>
        ))}
        <span id="r-dtext">{label}</span>
      </Dialog>
      <DropdownMenu id="r-dd">
        <button type="button" slot="trigger" id="r-ddt">
          Menu {label}
        </button>
        {opts.map((o) => (
          <DropdownMenuItem key={o} id={`r-ddi-${o}`} onVoidSelect={log(`select-${o}`)}>
            Item {o}
          </DropdownMenuItem>
        ))}
      </DropdownMenu>
      <Tabs id="r-tabs" value={tab} onVoidChange={log('tab', (e) => setTab(e.detail.value))}>
        {tabs.map((t) => (
          <TabPanel key={t} tab={t} label={`Tab ${t}`}>
            Panel {t} {label}
          </TabPanel>
        ))}
      </Tabs>
    </form>
  );
}

let root: Root | null = null;
window.mount = (strict = false) => {
  root = createRoot(document.getElementById('app')!);
  flushSync(() => root!.render(strict ? <StrictMode><App /></StrictMode> : <App />));
};
window.unmount = () => flushSync(() => root?.unmount());
