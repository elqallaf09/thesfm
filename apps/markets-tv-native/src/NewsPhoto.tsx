import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { tvNewsPhotoPath, tvNewsPhotoUrl } from '../../../src/lib/markets-tv/newsPhoto';
import type { TvNews } from '../../../src/lib/markets-tv/types';
import { ORIGIN } from './api';
import { Label } from './presentation';

export function NewsPhoto({ story }: { story: TvNews }) {
  const original = tvNewsPhotoUrl(story.imageUrl);
  const path = tvNewsPhotoPath(story.id);
  const candidates = [original, path && ORIGIN + path].filter((uri): uri is string => Boolean(uri));
  return <Photo key={JSON.stringify(candidates)} candidates={candidates}/>;
}

function Photo({ candidates }: { candidates: string[] }) {
  const [index, setIndex] = useState(0);
  const uri = candidates[index];
  return <View style={styles.frame}>
    {index > candidates.length ? <Label>SFM NEWS</Label> : <Image
      source={{ uri: uri ?? ORIGIN + '/markets-tv/sfm-news-fallback.webp' }} alt="" accessible={false}
      resizeMode={uri ? 'cover' : 'contain'} style={styles.photo} onError={() => setIndex(index + 1)}/>}
  </View>;
}

const styles = StyleSheet.create({
  frame: { width: '26%', aspectRatio: 4 / 3, maxHeight: 200, justifyContent: 'center', alignItems: 'center', borderRadius: 12, overflow: 'hidden' },
  photo: { height: '100%', width: '100%' },
});
