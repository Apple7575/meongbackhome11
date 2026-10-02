import test from 'node:test';
import assert from 'node:assert/strict';
import { withDistrict, inRegion, splitRegion, DISTRICTS } from '../src/districts.js';
import { filterDogs } from '../src/domain.js';

test('saved place gets the district in front only when it is missing', () => {
  assert.equal(withDistrict('석촌호수 동호 벤치', '송파구'), '송파구 석촌호수 동호 벤치');
  assert.equal(withDistrict('송파구 석촌호수', '송파구'), '송파구 석촌호수');
  assert.equal(withDistrict('장안구 연무동 공원', '수원시 장안구'), '장안구 연무동 공원');
  assert.equal(withDistrict('광교호수공원', '수원시 영통구'), '수원시 영통구 광교호수공원');
  assert.equal(withDistrict('', '송파구'), '');
  assert.equal(withDistrict('석촌호수', ''), '석촌호수');
});

test('region values match province, then district text (with gu inside a city)', () => {
  assert.deepEqual(splitRegion('서울 송파구'), ['서울', '송파구']);
  assert.deepEqual(splitRegion('전국'), ['전국', '']);
  assert.ok(inRegion('서울', '송파구 석촌호수', '서울 송파구'));
  assert.ok(!inRegion('서울', '강남구 역삼동', '서울 송파구'));
  assert.ok(inRegion('서울', '아무 글', '서울'));
  assert.ok(inRegion('부산', '아무 글', '전국'));
  assert.ok(!inRegion('부산', '중구 남포동', '서울 중구'));
  assert.ok(inRegion('경기', '장안구 연무동', '경기 수원시'));
  assert.ok(DISTRICTS.서울.includes('송파구') && DISTRICTS.세종.length === 0);
});

test('explore filter understands district values', () => {
  const dogs = [
    { id: 'a', region: '서울', location: '송파구 석촌호수', status: 'missing' },
    { id: 'b', region: '서울', location: '노원구 하계동', status: 'missing' },
  ];
  assert.deepEqual(filterDogs(dogs, { region: '서울 송파구' }).map((d) => d.id), ['a']);
  assert.deepEqual(filterDogs(dogs, { region: '서울' }).map((d) => d.id), ['a', 'b']);
});
