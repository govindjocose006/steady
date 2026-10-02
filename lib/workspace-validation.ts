import {z} from 'zod';
import {dateSchema} from './validation';
import {workStatuses} from './workspace';
const ref=z.string().uuid().nullable().default(null);
const optionalNumber=z.number().int().min(0).max(100000).nullable().default(null);
export const workspaceFields=z.object({
 title:z.string().trim().min(1,'Enter a title.').max(180),subjectId:ref,topicId:ref,projectId:ref,categoryId:ref,
 lectureNumber:z.string().trim().max(30).default(''),link:z.string().trim().max(2000).refine(s=>{if(!s)return true;try{return ['https:','http:'].includes(new URL(s).protocol);}catch{return false;}},'Use a complete http or https link.').default(''),
 plannedDate:dateSchema,estimatedMinutes:z.number().int().min(1).max(1440).default(45),status:z.enum(workStatuses).default('Planned'),completionDate:dateSchema.nullable().default(null),
 actualMinutes:z.number().int().min(0).max(10080).nullable().default(null),sessionType:z.enum(['practice','revision']).default('practice'),questionsAttempted:optionalNumber,questionsCorrect:optionalNumber,
 notes:z.string().max(10000).default(''),progressNote:z.string().max(2000).default(''),outcome:z.string().max(10000).default(''),nextStep:z.string().max(2000).default(''),sourceRecordId:ref,
}).refine(v=>v.questionsAttempted===null||v.questionsCorrect===null||v.questionsCorrect<=v.questionsAttempted,'Correct answers cannot exceed questions attempted.');
export const settingsFields=z.object({lectureTarget:z.number().int().min(1).max(30),lectureStretch:z.number().int().min(1).max(50),examDate:dateSchema.nullable(),researchDailyTarget:z.number().int().min(1).max(100).nullable()}).refine(v=>v.lectureStretch>=v.lectureTarget,'The stretch target must be at least the daily target.');
