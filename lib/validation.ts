import {z} from 'zod';
import {stages} from './applications';
export const dateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>s>='2000-01-01'&&s<='2100-12-31'&&!isNaN(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s,'Choose a valid date between 2000 and 2100.');
const link=z.string().trim().max(2000).refine(s=>{if(!s)return true;try{return ['https:','http:'].includes(new URL(s).protocol);}catch{return false;}},'Use a complete http or https link.');
const opportunity=z.object({
 fitPriority:z.number().int().min(1).max(999).nullable().optional(),fitNotes:z.string().max(3000).optional(),aliases:z.array(z.string().max(100)).max(10).optional(),
 preferences:z.array(z.object({code:z.string().max(30),title:z.string().max(250),fitPriority:z.number().int().min(1).max(999),fitNotes:z.string().max(3000),link})).max(10).optional(),
 verifiedOn:dateSchema.optional(),recruitment:z.string().max(180).optional(),verificationNote:z.string().max(3000).optional(),
 closingAt:z.string().datetime().nullable().optional(),closingLabel:z.string().max(100).optional(),closingTimezone:z.string().max(100).optional(),rolling:z.boolean().optional(),workflowLink:link.optional()
});
export const applicationFields=z.object({
  institution:z.string().trim().min(1,'Enter the university or institution.').max(180), country:z.string().trim().max(100).default(''),projectTitle:z.string().trim().max(250).default(''),
  supervisor:z.string().trim().max(180).default(''),link:link.default(''),deadline:dateSchema.nullable().default(null),notes:z.string().max(10000).default(''),nextAction:z.string().trim().max(180).default(''),
  opportunity:opportunity.optional(),
  stage:z.enum(stages).default('Shortlisted'),submissionDate:dateSchema.nullable().default(null),
  checklist:z.array(z.object({id:z.string().uuid(),label:z.string().trim().min(1,'Name each checklist item.').max(180),done:z.boolean()})).max(50).refine(items=>new Set(items.map(i=>i.id)).size===items.length,'Checklist item IDs must be unique.').default([])
}).refine(a=>a.stage!=='Submitted'||!!a.submissionDate,'Choose a submission date, or use Preparing for an unsubmitted application.');
