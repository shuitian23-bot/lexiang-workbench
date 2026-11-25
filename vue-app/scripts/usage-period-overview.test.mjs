import assert from 'node:assert/strict'
import test from 'node:test'
import { getUsagePeriodOverview } from '../src/domain/usagePeriodOverview.js'

test('uses two equal inclusive periods and keeps aggregate counts, cutoff stocks and rate percentage points distinct', () => {
  const reads=[]
  const model=getUsagePeriodOverview({
    startDate:'2026-10-30',endDate:'2026-11-05',rateKeys:['successRate'],
    readPeriod:(start,end)=>{
      reads.push([start,end])
      return start==='2026-10-30'
        ? {queries:140,calls:141,totalSkills:138,successRate:0.9}
        : {queries:100,calls:188,totalSkills:130,successRate:0.8}
    },
    readDay:()=>null,
  })
  assert.deepEqual(reads,[['2026-10-30','2026-11-05'],['2026-10-23','2026-10-29']])
  assert.equal(model.days,7)
  assert.equal(model.previousStartDate,'2026-10-23')
  assert.equal(model.previousEndDate,'2026-10-29')
  assert.deepEqual(model.current,{queries:140,calls:141,totalSkills:138,successRate:0.9})
  assert.deepEqual(model.previous,{queries:100,calls:188,totalSkills:130,successRate:0.8})
  assert.deepEqual(model.changes.queries,{currentValue:140,previousValue:100,value:0.4,difference:40,reason:null})
  assert.deepEqual(model.changes.calls,{currentValue:141,previousValue:188,value:-0.25,difference:-47,reason:null})
  assert.equal(model.changes.totalSkills.difference,8)
  assert.ok(Math.abs(model.changes.successRate.difference-10)<1e-12)
  assert.ok(Math.abs(model.changes.successRate.value-0.125)<1e-12)
})

test('one day, thirty days and custom spans retain exact calendar boundaries across months and leap years', () => {
  for(const range of [
    {startDate:'2026-11-05',endDate:'2026-11-05',days:1,previousStartDate:'2026-11-04',previousEndDate:'2026-11-04'},
    {startDate:'2026-10-07',endDate:'2026-11-05',days:30,previousStartDate:'2026-09-07',previousEndDate:'2026-10-06'},
    {startDate:'2026-12-30',endDate:'2027-01-02',days:4,previousStartDate:'2026-12-26',previousEndDate:'2026-12-29'},
    {startDate:'2024-02-28',endDate:'2024-03-01',days:3,previousStartDate:'2024-02-25',previousEndDate:'2024-02-27'},
  ]) {
    const model=getUsagePeriodOverview({...range,readPeriod:()=>({calls:1}),readDay:()=>null})
    assert.equal(model.startDate,range.startDate)
    assert.equal(model.endDate,range.endDate)
    assert.equal(model.days,range.days)
    assert.equal(model.previousStartDate,range.previousStartDate)
    assert.equal(model.previousEndDate,range.previousEndDate)
    assert.equal(model.points.length,range.days)
    assert.equal(model.points[0].date,range.startDate)
    assert.equal(model.points.at(-1).date,range.endDate)
  }
})

test('missing values never become zero and zero bases keep valid absolute or percentage-point differences', () => {
  const model=getUsagePeriodOverview({
    startDate:'2026-11-05',endDate:'2026-11-05',rateKeys:['successRate','taskSuccessRate'],
    readPeriod:start=>start==='2026-11-05'
      ? {queries:0,calls:5,successRate:0,taskSuccessRate:null}
      : {queries:0,calls:0,successRate:0,taskSuccessRate:0,failed:4},
  })
  assert.deepEqual(model.changes.queries,{currentValue:0,previousValue:0,value:null,difference:0,reason:'zero-base'})
  assert.deepEqual(model.changes.calls,{currentValue:5,previousValue:0,value:null,difference:5,reason:'zero-base'})
  assert.deepEqual(model.changes.successRate,{currentValue:0,previousValue:0,value:null,difference:0,reason:'zero-base'})
  assert.deepEqual(model.changes.taskSuccessRate,{currentValue:null,previousValue:0,value:null,difference:null,reason:'missing'})
  assert.deepEqual(model.changes.failed,{currentValue:null,previousValue:4,value:null,difference:null,reason:'missing'})
  assert.equal(model.current.failed,null)
  const missing=getUsagePeriodOverview({startDate:'2026-11-05',endDate:'2026-11-05',readPeriod:start=>start==='2026-11-05'?null:{calls:0}})
  assert.equal(missing.current,null)
  assert.deepEqual(missing.changes.calls,{currentValue:null,previousValue:0,value:null,difference:null,reason:'missing'})
})

test('normalizes non-finite, negative, nonnumeric and out-of-range rate values without changing known zero', () => {
  const source={calls:Infinity,queries:-1,newSkills:'2',totalSkills:0,successRate:1.1,likeRate:NaN,taskSuccessRate:0}
  const before=structuredClone(source)
  const model=getUsagePeriodOverview({startDate:'2026-11-05',endDate:'2026-11-05',rateKeys:['successRate','likeRate','taskSuccessRate'],readPeriod:()=>source,readDay:()=>source})
  assert.deepEqual(model.current,{calls:null,queries:null,newSkills:null,totalSkills:0,successRate:null,likeRate:null,taskSuccessRate:0})
  assert.equal(model.points[0].calls,null)
  assert.equal(model.points[0].taskSuccessRate,0)
  assert.deepEqual(source,before)
})

test('daily trends preserve gaps and original day values rather than summing stocks or deriving rates from period totals', () => {
  const days={
    '2026-11-01':{calls:3,totalSkills:136,successRate:1},
    '2026-11-03':{calls:0,totalSkills:138,successRate:null},
  }
  const reads=[]
  const model=getUsagePeriodOverview({
    startDate:'2026-11-01',endDate:'2026-11-03',rateKeys:['successRate'],
    readPeriod:()=>({calls:20,totalSkills:138,successRate:0.8}),
    readDay:date=>{reads.push(date);return days[date]??null},
  })
  assert.deepEqual(reads,['2026-11-01','2026-11-02','2026-11-03'])
  assert.deepEqual(model.points,[
    {date:'2026-11-01',calls:3,totalSkills:136,successRate:1},
    {date:'2026-11-02',calls:null,totalSkills:null,successRate:null},
    {date:'2026-11-03',calls:0,totalSkills:138,successRate:null},
  ])
  assert.equal(model.current.calls,20)
  assert.equal(model.current.totalSkills,138)
  assert.equal(model.current.successRate,0.8)
  const missing=getUsagePeriodOverview({startDate:'2026-11-01',endDate:'2026-11-03',readPeriod:()=>null,readDay:date=>days[date]??null})
  assert.equal(missing.current,null)
  assert.equal(missing.previous,null)
  assert.equal(missing.changes.calls.reason,'missing')
  assert.equal(missing.points[0].calls,3)
})

test('invalid and reversed ranges never invoke either data reader', () => {
  const fail=()=>{throw new Error('Invalid ranges must not read source data')}
  for(const range of [
    {startDate:'2026-02-30',endDate:'2026-03-01'},
    {startDate:'2026-11-05',endDate:'2026-11-04'},
    {startDate:'2026-11-04',endDate:'2026-13-01'},
    {startDate:'2026-1-01',endDate:'2026-01-02'},
    {},
  ]) {
    const model=getUsagePeriodOverview({...range,readPeriod:fail,readDay:fail})
    assert.equal(model.startDate,null)
    assert.equal(model.endDate,null)
    assert.equal(model.days,0)
    assert.equal(model.previousStartDate,null)
    assert.equal(model.previousEndDate,null)
    assert.equal(model.current,null)
    assert.equal(model.previous,null)
    assert.deepEqual(model.changes,{})
    assert.deepEqual(model.points,[])
  }
})

test('fields present only in a previous period or a day remain missing elsewhere and all returned records are detached', () => {
  const source={calls:10}
  const model=getUsagePeriodOverview({
    startDate:'2026-11-05',endDate:'2026-11-05',
    readPeriod:start=>start==='2026-11-05'?source:{calls:5,queries:2},
    readDay:()=>({...source,likes:0}),
  })
  assert.deepEqual(model.current,{calls:10,queries:null,likes:null})
  assert.deepEqual(model.previous,{calls:5,queries:2,likes:null})
  assert.deepEqual(model.points[0],{date:'2026-11-05',calls:10,queries:null,likes:0})
  assert.equal(model.changes.likes.reason,'missing')
  model.current.calls=99
  model.points[0].calls=88
  assert.equal(source.calls,10)
  assert.equal(model.previous.calls,5)
})
