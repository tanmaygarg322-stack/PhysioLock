"""Extract only exercise rows and their XObject images from the seven supplied PDFs.
No patient, practitioner, contact details or whole PDF is bundled with the app.
"""
import hashlib, json, re, unicodedata
from pathlib import Path
import pdfplumber
from pypdf import PdfReader
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
DOWNLOADS = Path.home() / 'Downloads'
FILES = [
 ('Head, face or neck', 'Head, neck, face.pdf', 'neck'),
 ('Shoulder or arm', 'Exercise_Plan_f_f_Arm and Shoulder Mobility and Strengthening Plan (1).pdf', 'shoulder'),
 ('Wrist, hand or fingers', 'Exercise_Plan_f_f_Finger and Hand Mobility Plan.pdf', 'hand'),
 ('Chest, back or abdomen', 'Exercise_Plan_f_f_Abdomen, Back and Chest Strengthening Plan.pdf', 'core'),
 ('Pelvis, hip or thigh', 'Exercise_Plan_cc_c_Pelvis, Hip, and Thigh Strengthening Plan.pdf', 'hip'),
 ('Knee or lower leg', 'Exercise_Plan_cc_c_Knee and Lower Leg Strengthening Plan.pdf', 'knee'),
 ('Ankle, foot or toes', 'Exercise_Plan_cc_c_Ankle and Foot Mobility and Strengthening Plan.pdf', 'ankle'),
]
def clean(s):
 return unicodedata.normalize('NFKC', s).strip()

records=[]
for region, filename, slug in FILES:
 path=DOWNLOADS/filename
 reader=PdfReader(path)
 digest=hashlib.sha256(path.read_bytes()).hexdigest()
 index=0
 with pdfplumber.open(path) as pdf:
  for page_index,page in enumerate(pdf.pages):
   pictures=sorted(page.images,key=lambda i:i['top'])
   embedded={Path(i.name).stem:i for i in reader.pages[page_index].images}
   for j,picture in enumerate(pictures):
    top=max(0,picture['top']-1)
    bottom=pictures[j+1]['top']-3 if j+1<len(pictures) else page.height-42
    lines=[l for l in page.extract_text_lines(return_chars=True) if l['x0']>=220 and top<=l['top']<bottom]
    heading=[]
    while lines and all('Bold' in c['fontname'] for c in lines[0]['chars'] if c['text'].strip()):
     heading.append(lines.pop(0)['text'])
    assert heading, (filename,page_index,picture['name'],'missing heading')
    text=[clean(line['text']) for line in lines]
    if not any(re.match(r'^(Repeat \d|Hold for \d|Perform \d)',t) for t in text) and j==len(pictures)-1 and page_index+1<len(pdf.pages):
     following=pdf.pages[page_index+1]
     limit=min((p['top'] for p in following.images),default=following.height-42)
     text.extend(clean(l['text']) for l in following.extract_text_lines(return_chars=False) if l['x0']>=220 and l['top']<limit)
    dose_index=next((k for k,t in enumerate(text) if re.match(r'^(Repeat \d|Hold for \d|Perform \d)',t)),len(text))
    description=' '.join(text[:dose_index])
    video=next((re.search(r'https?://\S+',t).group(0) for t in text if t.startswith('Video:')),None)
    dosage=' '.join(t for t in text[dose_index:] if not t.startswith('Video:') and not t.startswith('Dear '))
    assert description and '@' not in description
    index+=1
    record_id=f'pdf-{slug}-{index:02d}'
    image=embedded[picture['name']]
    destination=ROOT/'catalog'/'images'/f'{record_id}{Path(image.name).suffix}'
    destination.write_bytes(image.data)
    infant=re.search(r"\byour baby\b",description,re.I)
    age_evidence=[t for t in text[:dose_index] if re.search(r'\byour baby\b',t,re.I)]
    records.append(dict(id=record_id,region=region,name=clean(' '.join(heading)),description=description,
     image=destination.relative_to(ROOT).as_posix(),videoUrl=video,
     sourcePrescription=dosage,sourcePrescriptionNotice='Exported example instructions; not a prescription for this patient. Units not stated in the PDF are not inferred.',
     source=dict(type='user_supplied_pdf',document=filename,page=page_index+1,sha256=digest),
     ageGuidance=dict(population='infant' if infant else 'unspecified',evidence=age_evidence,
      status='source_population_only' if infant else 'not_established',minimumAge=None,maximumAge=None,
      note='Source describes a baby. Pediatric clinician assessment and caregiver instruction are required; exact age limits are not supplied.' if infant else 'No exercise-specific age range is supplied. Suitability requires clinician review; age alone is not clearance.'),
     approvalStatus='pending_clinician_review',canPractice=False))
  print(region,index)
(ROOT/'catalog'/'catalog.mjs').write_text('// Generated from supplied PDF exercise rows. Do not invent clinical eligibility.\nexport const EXERCISE_CATALOG='+json.dumps(records,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
(ROOT/'catalog'/'images.js').write_text('export const CATALOG_IMAGES={\n'+',\n'.join(f'  "{r["id"]}":require("./images/{Path(r["image"]).name}")' for r in records)+'\n};\n',encoding='utf-8')
# Visual audit: every image paired with its exact extracted name.
sheet=Image.new('RGB',(1000,250*((len(records)+4)//5)),'white');draw=ImageDraw.Draw(sheet)
for i,r in enumerate(records):
 image=Image.open(ROOT/r['image']).convert('RGB');image.thumbnail((180,180))
 x=(i%5)*200;y=(i//5)*250;sheet.paste(image,(x+(200-image.width)//2,y))
 label=r['id']+'\n'+r['name']
 import textwrap
 draw.multiline_text((x+5,y+182),'\n'.join(textwrap.wrap(label,27)),fill='black')
sheet.save(ROOT/'tmp'/'pdfs'/'catalog-contact-sheet.jpg')
print('TOTAL',len(records),'INFANT',sum(r['ageGuidance']['population']=='infant' for r in records))
