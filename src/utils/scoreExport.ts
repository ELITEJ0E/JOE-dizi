import type { DiziNote, Song } from '../types/dizi';

/** Group by the actual bar numbers, not every fourth event (ornaments can be 1/16 notes). */
export function groupScoreMeasures(notes: DiziNote[]): Array<{ number: number; notes: DiziNote[] }> {
  const measures = new Map<number, DiziNote[]>();
  for (const note of notes) {
    if (!measures.has(note.measureNumber)) measures.set(note.measureNumber, []);
    measures.get(note.measureNumber)!.push(note);
  }
  return [...measures.entries()].sort(([a], [b]) => a - b).map(([number, contained]) => ({ number, notes: contained }));
}

export function formatJianpuText(song: Song): string {
  const title = [song.titleEn, song.titleZh].filter(Boolean).join(' / ') || 'Untitled';
  const heading = `${title}\n${song.musicalKey} · ${song.timeSignature} · ♩=${song.bpm} · ${song.diziKey} Dizi\nJOE Dizi Studio\n`;
  const measures = groupScoreMeasures(song.notes);
  const lines: string[] = [];
  for (let i = 0; i < measures.length; i += 4) {
    lines.push(measures.slice(i, i + 4).map(measure => {
      const symbols = measure.notes.map(note => {
        const dots = note.octaveDot > 0 ? '̇'.repeat(note.octaveDot) : '̣'.repeat(-note.octaveDot);
        return `${note.jianpu}${dots}${note.isDotted ? '·' : ''}`;
      });
      return `| ${symbols.join(' ')} `;
    }).join('') + '|');
  }
  return `${heading}\n${lines.join('\n')}\n`;
}
