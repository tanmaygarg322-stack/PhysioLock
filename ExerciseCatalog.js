import React,{useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,Easing,Image,Linking,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {catalogDisplay,exerciseEmptyState} from './catalog-display.mjs';
import {exerciseSchedule} from './exercise-schedule.mjs';
import {CATALOG_IMAGES} from './catalog/images';
import {IMAGE_FRAMING} from './catalog/image-framing.mjs';
function LoadingBar(){
 const progress=useRef(new Animated.Value(0)).current;
 const [width,setWidth]=useState(240),[reduced,setReduced]=useState(true);
 useEffect(()=>{let active=true;AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(active)setReduced(value);}).catch(()=>{});const listener=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduced);return()=>{active=false;listener.remove();};},[]);
 useEffect(()=>{if(reduced)return;const animation=Animated.loop(Animated.timing(progress,{toValue:1,duration:1400,easing:Easing.linear,useNativeDriver:true}));animation.start();return()=>{animation.stop();progress.setValue(0);};},[reduced,progress]);
 return <View accessibilityRole="progressbar" accessibilityLabel="Preparing your exercises" accessibilityState={{busy:true}} style={{marginVertical:14}}><Text accessibilityLiveRegion="polite" style={s.name}>Preparing your exercises…</Text><View onLayout={event=>setWidth(event.nativeEvent.layout.width)} style={{height:8,backgroundColor:'#dceff2',borderRadius:8,overflow:'hidden',marginTop:10}}><Animated.View style={{width:'40%',height:8,borderRadius:8,backgroundColor:'#08a7ad',transform:[{translateX:reduced?width*.3:progress.interpolate({inputRange:[0,1],outputRange:[-width*.4,width]})}]}}/></View></View>;
}
function ExerciseImage({record,onError}){
 const [width,setWidth]=useState(240);const frame=IMAGE_FRAMING[record.id];
 const scale=Math.min(width/frame.width,220/frame.visibleHeight);
 return <View onLayout={event=>setWidth(event.nativeEvent.layout.width)} style={{width:'100%',height:220,marginVertical:12,backgroundColor:'white',borderRadius:10,alignItems:'center',justifyContent:'center'}}><View style={{width:frame.width*scale,height:frame.visibleHeight*scale,overflow:'hidden'}}><Image source={CATALOG_IMAGES[record.id]} accessibilityLabel={`Illustration: ${record.name}`} onError={onError} resizeMode="stretch" style={{width:frame.width*scale,height:frame.height*scale}}/></View></View>;
}
function Entry({record,large}){
 const [expanded,setExpanded]=useState(false),[error,setError]=useState(''),[imageFailed,setImageFailed]=useState(false);
 const text=large?{fontSize:19,lineHeight:28}:null;
 async function video(){try{const u=new URL(record.videoUrl);if(!['youtu.be','www.youtube.com','youtube.com'].includes(u.hostname))throw new Error();await Linking.openURL(record.videoUrl.replace(/^http:/,'https:'));}catch{setError('The source video could not be opened.');}}
 return <View style={s.entry}>
  <Text accessibilityRole="header" style={[s.name,text]}>{record.name}</Text>
  <ExerciseImage record={record} onError={()=>setImageFailed(true)}/>
  <Text selectable style={[s.text,text]}>{record.description}</Text>
  {!!record.videoUrl&&<Pressable accessibilityRole="link" onPress={video} style={s.video}><Text style={[s.link,text]}>Watch video ↗</Text></Pressable>}
  {!!error&&<Text accessibilityLiveRegion="polite" style={[s.text,text]}>{error}</Text>}
  <Pressable accessibilityRole="button" accessibilityState={{expanded}} onPress={()=>setExpanded(!expanded)} style={s.video}><Text style={s.link}>{expanded?'Hide source details':'Source details'}</Text></Pressable>
  {imageFailed&&<Text accessibilityLiveRegion="polite" style={[s.text,text]}>The image could not load. Reload this project in Expo Go while connected to your computer’s Wi-Fi.</Text>}
  {expanded&&<><Text style={[s.meta,text]}>Source: {record.source.document} · Page {record.source.page} · {record.id}</Text><Text style={[s.meta,text]}>Awaiting clinician approval. Guided practice is unavailable.</Text>{!!record.sourcePrescription&&<><Text style={[s.label,text]}>Original export dosage · Reference only</Text><Text selectable style={[s.text,text]}>{record.sourcePrescription}</Text><Text style={[s.meta,text]}>{record.sourcePrescriptionNotice}</Text></>}{!!error&&<Text accessibilityLiveRegion="polite" style={[s.text,text]}>{error}</Text>}</>}
 </View>;
}
export default function ExerciseCatalog({profile,suggestions,paused=false,large=false,onMatch,busy=false,ready=true,error=''}){
 const {selected,stale}=catalogDisplay(profile,suggestions,paused);
 const days=exerciseSchedule(profile,suggestions,paused);
 const emptyMessage=exerciseEmptyState(profile,suggestions,{busy,ready,error,paused});
 const [selectedDay,setSelectedDay]=useState('');
 const activeDay=days.find(day=>day.day===selectedDay)||days[0];
 const text=large?{fontSize:19,lineHeight:28}:null;
 return <View>
 {busy&&<LoadingBar/>}
 {!!selected.length&&<Text style={[s.meta,text]}>Awaiting clinician review · Times are estimates</Text>}
 {stale&&<Text style={[s.text,text]}>Refresh exercises to update your schedule.</Text>}
 <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>{days.map(day=><Pressable key={day.day} accessibilityRole="tab" accessibilityState={{selected:day.day===activeDay?.day}} onPress={()=>setSelectedDay(day.day)} style={[s.chip,day.day===activeDay?.day&&s.selected]}><Text style={[s.chipText,text]}>{day.day}</Text></Pressable>)}</ScrollView>
 {[activeDay].filter(Boolean).map(day=><View key={day.day} style={s.card}>
  <Text accessibilityRole="header" style={[s.title,large&&{fontSize:25}]}>{day.day}</Text>
  <Text style={[s.name,text]}>{day.start?`${day.start}–${day.end}`:'Choose a time'}</Text>
  {day.activities.map(({record,start,end})=><View key={record.id}><Text style={[s.label,text]}>{start}–{end}</Text><Entry record={record} large={large}/></View>)}
  {!day.activities.length&&<Text style={[s.text,text]}>{day.status==='paused'?'Exercises paused.':day.status==='missing_information'?'Add a time and duration in your schedule.':emptyMessage}</Text>}
 </View>)}
 {!days.length&&<Text style={[s.text,text]}>Choose your exercise days and times to see your schedule.</Text>}
 {!!onMatch&&<Pressable accessibilityRole="button" disabled={busy||paused||!ready} accessibilityState={{disabled:busy||paused||!ready,busy}} onPress={onMatch} style={[s.video,(busy||paused||!ready)&&{opacity:.5}]}><Text style={[s.link,text]}>{busy?'Updating exercises…':selected.length?'Refresh exercises':'Get exercises'}</Text></Pressable>}
 </View>;
}
const s=StyleSheet.create({card:{backgroundColor:'white',borderWidth:1,borderColor:'#d8e9ed',borderRadius:21,padding:18,marginVertical:9},title:{fontSize:20,fontWeight:'700',color:'#102d40',marginBottom:11},text:{fontSize:13,lineHeight:22,color:'#355968',marginBottom:9},meta:{fontSize:11,lineHeight:18,color:'#567985',marginVertical:5},label:{fontSize:12,fontWeight:'700',color:'#245968',marginVertical:8},notice:{backgroundColor:'#fff5dc',padding:13,borderRadius:14,marginVertical:10},entry:{backgroundColor:'#f0f7f8',padding:12,borderRadius:15,marginVertical:8},entryHead:{gap:12,alignItems:'stretch'},thumbnail:{width:'100%',height:220,marginVertical:12,backgroundColor:'white',borderRadius:10},name:{fontSize:15,fontWeight:'700',lineHeight:23,color:'#183d50'},fullImage:{width:'100%',height:270,backgroundColor:'white',marginVertical:12,borderRadius:12},chip:{padding:13,minHeight:48,borderWidth:1,borderColor:'#b0d5db',borderRadius:14,backgroundColor:'#f0fafb',marginVertical:7},selected:{backgroundColor:'#d6f4ec',borderColor:'#087f89'},chipText:{color:'#176c77',fontWeight:'600'},chips:{gap:8},link:{fontSize:12,lineHeight:20,color:'#087f89',fontWeight:'700'},video:{padding:12,minHeight:48,justifyContent:'center',backgroundColor:'#e0f3ef',borderRadius:12,marginVertical:8},search:{minHeight:48,borderWidth:1,borderColor:'#b0d5db',borderRadius:12,padding:12,fontSize:14,color:'#173e50'}});
