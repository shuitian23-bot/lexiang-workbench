import assert from 'node:assert/strict'
import test from 'node:test'
import { getUsageActivityOverview } from '../src/domain/usageActivityOverview.js'

const snapshot = (totalUsers, login, ai = login) => ({
  totalUsers, windows: {
    login: { dau: login[0], wau: login[1], mau: login[2] },
    ai: { dau: ai[0], wau: ai[1], mau: ai[2] },
  },
})
const readFrom = records => date => records[date] ?? null

test('all stock and rolling metrics compare the selected inclusive 1, 7, 30 or custom day span', () => {
  for(const range of [
    {startDate:'2026-11-05',days:1,previousStartDate:'2026-11-04',previousEndDate:'2026-11-04'},
    {startDate:'2026-10-30',days:7,previousStartDate:'2026-10-23',previousEndDate:'2026-10-29'},
    {startDate:'2026-10-07',days:30,previousStartDate:'2026-09-07',previousEndDate:'2026-10-06'},
    {startDate:'2026-11-02',days:4,previousStartDate:'2026-10-29',previousEndDate:'2026-11-01'},
  ]) {
    const previousDate=range.previousEndDate
    const report=getUsageActivityOverview({startDate:range.startDate,endDate:'2026-11-05',readSnapshot:readFrom({
      '2026-11-05':snapshot(110,[5,30,40],[0,15,20]),
      [previousDate]:snapshot(100,[10,20,40],[4,10,25]),
    })})
    assert.equal(report.asOfDate,'2026-11-05')
    assert.equal(report.startDate,range.startDate)
    assert.equal(report.endDate,'2026-11-05')
    assert.equal(report.days,range.days)
    assert.equal(report.previousStartDate,range.previousStartDate)
    assert.equal(report.previousEndDate,previousDate)
    assert.deepEqual(report.current,snapshot(110,[5,30,40],[0,15,20]))
    assert.deepEqual(report.changes.totalUsers,{value:0.1,previousValue:100,previousDate,reason:null})
    assert.deepEqual(report.changes.login.dau,{value:-0.5,previousValue:10,previousDate,reason:null})
    assert.deepEqual(report.changes.login.wau,{value:0.5,previousValue:20,previousDate,reason:null})
    assert.deepEqual(report.changes.login.mau,{value:0,previousValue:40,previousDate,reason:null})
    assert.equal(report.changes.ai.dau.previousDate,previousDate)
    assert.equal(report.changes.ai.dau.value,-1)
    assert.equal(report.changes.ai.wau.value,0.5)
    assert.equal(report.changes.ai.mau.value,-0.2)
  }
})

test('never substitutes an earlier available day for an exact missing comparison or current date', () => {
  const records={
    '2026-11-05':snapshot(20,[2,5,9]),
    '2026-11-03':snapshot(10,[1,2,3]),
    '2026-10-28':snapshot(10,[1,2,3]),
    '2026-10-06':snapshot(10,[1,2,3]),
  }
  const reads=[]
  const report=getUsageActivityOverview({startDate:'2026-11-05',endDate:'2026-11-05',readSnapshot:date=>{reads.push(date);return records[date]??null}})
  assert.deepEqual(report.changes.totalUsers,{value:null,previousValue:null,previousDate:'2026-11-04',reason:'missing'})
  assert.deepEqual(report.changes.login.wau,{value:null,previousValue:null,previousDate:'2026-11-04',reason:'missing'})
  assert.ok(!reads.includes('2026-11-03')&&!reads.includes('2026-10-28'))
  const missing=getUsageActivityOverview({startDate:'2026-11-04',endDate:'2026-11-04',readSnapshot:readFrom(records)})
  assert.equal(missing.current,null)
  assert.deepEqual(missing.changes.totalUsers,{value:null,previousValue:10,previousDate:'2026-11-03',reason:'missing'})
})

test('a zero comparison base is unknown percentage even when both values are zero', () => {
  const current=snapshot(5,[0,5,5])
  current.windows.ai.dau=null
  const report=getUsageActivityOverview({startDate:'2026-11-05',endDate:'2026-11-05',readSnapshot:readFrom({
    '2026-11-05':current,
    '2026-11-04':snapshot(0,[0,0,0]),
    '2026-10-29':snapshot(0,[0,0,0]),
    '2026-10-06':snapshot(0,[0,0,0]),
  })})
  assert.deepEqual(report.changes.totalUsers,{value:null,previousValue:0,previousDate:'2026-11-04',reason:'zero-base'})
  assert.equal(report.changes.login.dau.reason,'zero-base')
  assert.equal(report.changes.login.dau.value,null)
  assert.equal(report.changes.login.wau.reason,'zero-base')
  assert.equal(report.changes.login.mau.reason,'zero-base')
  assert.equal(report.changes.ai.dau.reason,'missing')
  assert.equal(report.changes.ai.dau.previousValue,0)
})

test('trend points preserve each original daily snapshot and gaps without adding or averaging users', () => {
  const report=getUsageActivityOverview({startDate:'2026-11-01',endDate:'2026-11-04',asOfDate:'2026-11-05',readSnapshot:readFrom({
    '2026-11-01':snapshot(50,[1,70,100]),
    '2026-11-03':snapshot(52,[2,75,110]),
    '2026-11-04':snapshot(55,[3,80,120]),
    '2026-11-05':snapshot(60,[4,88,130]),
  })})
  assert.deepEqual(report.points.map(point=>point.date),['2026-11-01','2026-11-02','2026-11-03','2026-11-04'])
  assert.deepEqual(report.points[1],{date:'2026-11-02',totalUsers:null,login:{dau:null,wau:null,mau:null},ai:{dau:null,wau:null,mau:null}})
  assert.deepEqual(report.points.map(point=>point.login.wau),[70,null,75,80])
  assert.deepEqual(report.points.map(point=>point.totalUsers),[50,null,52,55])
  assert.equal(report.current.windows.login.wau,88)
  assert.equal(report.current.totalUsers,60)
  assert.equal(report.asOfDate,'2026-11-05')
  assert.equal(report.changes.totalUsers.previousDate,'2026-11-01')
  assert.equal(report.changes.login.wau.previousDate,'2026-11-01')
  assert.equal(report.changes.login.mau.previousDate,'2026-11-01')
})

test('normalizes invalid counts to missing while keeping known zero and source records unchanged', () => {
  const source=snapshot(NaN,[-1,Infinity,0],[null,12,'5'])
  const before=structuredClone(source)
  const report=getUsageActivityOverview({startDate:'2026-11-05',endDate:'2026-11-05',readSnapshot:()=>source})
  assert.deepEqual(report.current,snapshot(null,[null,null,0],[null,12,null]))
  assert.deepEqual(report.points[0],{date:'2026-11-05',totalUsers:null,login:{dau:null,wau:null,mau:0},ai:{dau:null,wau:12,mau:null}})
  assert.equal(report.changes.login.dau.reason,'missing')
  assert.deepEqual(source,before)
})

test('invalid or reversed dates return an empty report without invoking the snapshot reader', () => {
  for(const range of [
    {startDate:'2026-02-30',endDate:'2026-03-01'},
    {startDate:'2026-11-05',endDate:'2026-11-04'},
    {startDate:'2026-11-04',endDate:'not-a-date'},
    {startDate:'2026-11-04',endDate:'2026-11-05',asOfDate:'2026-13-01'},
    {},
  ]) {
    const report=getUsageActivityOverview({...range,readSnapshot:()=>{throw new Error('Invalid ranges must not read snapshots')}})
    assert.equal(report.asOfDate,null)
    assert.equal(report.days,0)
    assert.equal(report.previousStartDate,null)
    assert.equal(report.previousEndDate,null)
    assert.equal(report.current,null)
    assert.deepEqual(report.points,[])
    assert.deepEqual(report.changes.totalUsers,{value:null,previousValue:null,previousDate:null,reason:'missing'})
  }
})

test('uses UTC calendar offsets, reads each exact date once and returns detached current and trend values', () => {
  const source=snapshot(20,[20,20,20])
  const reads=[]
  const report=getUsageActivityOverview({startDate:'2026-02-28',endDate:'2026-03-01',readSnapshot:date=>{reads.push(date);return source}})
  assert.equal(report.changes.login.dau.previousDate,'2026-02-27')
  assert.equal(report.changes.login.wau.previousDate,'2026-02-27')
  assert.equal(report.changes.login.mau.previousDate,'2026-02-27')
  assert.deepEqual([...reads].sort(),['2026-02-27','2026-02-28','2026-03-01'])
  report.points[1].login.dau=999
  assert.equal(report.current.windows.login.dau,20)
  report.current.windows.ai.mau=999
  assert.equal(source.windows.ai.mau,20)
})
