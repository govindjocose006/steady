'use client';

import {useSyncExternalStore, type ReactNode} from 'react';
import {ThemeProvider, useTheme} from 'next-themes';
import {Dialog} from 'radix-ui';
import {Check, Palette, X} from 'lucide-react';

const schemes = [
  {id: 'forest', name: 'Forest', description: 'Sage & warm white'},
  {id: 'ocean', name: 'Ocean', description: 'Blue & cloud white'},
  {id: 'lavender', name: 'Lavender', description: 'Violet & soft pearl'},
  {id: 'terracotta', name: 'Terracotta', description: 'Clay & cream'},
  {id: 'slate', name: 'Slate', description: 'Graphite & cool white'},
];
const subscribe = () => () => {};

export function AppearanceProvider({children}: {children: ReactNode}) {
  return <ThemeProvider attribute="data-palette" storageKey="steady-colour-scheme" defaultTheme="forest" themes={schemes.map(scheme => scheme.id)} enableSystem={false} enableColorScheme={false} disableTransitionOnChange>{children}</ThemeProvider>;
}

export default function AppearancePicker() {
  const {theme, setTheme} = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const selected = mounted ? schemes.find(scheme => scheme.id === theme) ?? schemes[0] : null;

  return <Dialog.Root>
    <Dialog.Trigger className="appearance-trigger"><Palette size={17}/><span>Appearance</span></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="dialog-overlay"/>
      <Dialog.Content className="task-dialog appearance-dialog">
        <div className="dialog-heading">
          <div><Dialog.Title>Make Steady yours.</Dialog.Title><Dialog.Description>Choose the colours you feel at home with.</Dialog.Description></div>
          <Dialog.Close className="icon-button" aria-label="Close appearance"><X size={20}/></Dialog.Close>
        </div>
        <div className="scheme-grid" role="group" aria-label="Colour schemes">
          {schemes.map(scheme => <button key={scheme.id} className="scheme-option" data-palette={scheme.id} aria-pressed={selected?.id === scheme.id} onClick={() => setTheme(scheme.id)}>
            <span className="scheme-preview" aria-hidden="true"><span className="scheme-rail"><i/><i/><i/></span><span className="scheme-page"><i/><span><i/><i/></span><b/></span></span>
            <span className="scheme-caption"><span><strong>{scheme.name}</strong><small>{scheme.description}</small></span><span className="scheme-check">{selected?.id === scheme.id && <Check size={16}/>}</span></span>
          </button>)}
        </div>
        <p className="appearance-note" role="status">{selected ? `${selected.name} selected. ` : ''}Your choice is saved in this browser. You can change it anytime.</p>
        <div className="dialog-actions"><Dialog.Close className="primary-button">Done</Dialog.Close></div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
