import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NEWS_MOVER_KEYS, moverValue, newsMoverText, newsMoversPath, parseNewsMovers } from '../../../src/lib/markets-tv/newsMovers';
import type { TvReceiverNewsChannel } from '../../../src/lib/markets-tv/newsReceiver';
import { usePresentation } from './presentation';
import { request } from './receiverApi';
import { useResource } from './useResource';

export function NativeNewsMovers({ channel, tickerPath, revision }: { channel: TvReceiverNewsChannel; tickerPath: string | null; revision: number }) {
  const { language, colors, row } = usePresentation();
  const path = newsMoversPath(channel, tickerPath);
  const load = useCallback(async (signal: AbortSignal) => parseNewsMovers(await request(path, signal), channel), [path, channel]);
  const result = useResource(path + ':' + revision, load, 180_000);
  const data = result.data?.channel === channel ? result.data : null;
  return <View style={s.container}>
    <View style={[s.grid, row]}>{NEWS_MOVER_KEYS.map(key => <View key={key} style={[s.card, {backgroundColor:colors.panel,borderColor:colors.border}]}>
      <Text numberOfLines={2} style={[s.title,{color:colors.text}]}>{newsMoverText(language,key)}</Text>
      {data?.lists[key].length ? data.lists[key].map(item => <View key={item.symbol+':'+item.exchange+':'+item.currency} style={[s.line,row]}>
        <View style={s.identity}><Text numberOfLines={1} style={[s.name,{color:colors.text}]}>{item.name}</Text><Text numberOfLines={1} style={[s.small,{color:colors.muted}]}>{item.symbol}</Text></View>
        <View><Text numberOfLines={1} style={[s.name,{color:key==='gainers'?colors.up:key==='losers'?colors.down:colors.text}]}>{moverValue(item,key)}</Text><Text numberOfLines={1} style={[s.small,{color:colors.muted}]}>{new Intl.NumberFormat('en-US',{maximumFractionDigits:4}).format(item.price)} {item.currency}</Text></View>
      </View>) : <Text style={[s.small,{color:colors.muted}]}>{newsMoverText(language,result.loading?'loading':'unavailable')}</Text>}
    </View>)}</View>
    <Text numberOfLines={2} style={[s.small,{color:colors.muted}]}>{newsMoverText(language,'partial')} · {newsMoverText(language,channel==='cryptoNews'?'cryptoVolume':'stocksVolume')}{data?.source ? ' · '+data.source : ''}</Text>
  </View>;
}
const s=StyleSheet.create({container:{gap:4},grid:{gap:8},card:{flex:1,minWidth:0,borderWidth:1,borderRadius:12,padding:8,gap:3},title:{fontSize:19,fontWeight:'700'},line:{alignItems:'center',justifyContent:'space-between',gap:4},identity:{flex:1,minWidth:0},name:{fontSize:16,fontWeight:'600'},small:{fontSize:13}});
