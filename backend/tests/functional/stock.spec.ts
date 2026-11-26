import { readFile } from 'node:fs/promises'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import importContent from '#services/card_importer'

async function loadFixture() {
  const raw = await readFile(new URL('../fixtures/content.json', import.meta.url), 'utf8')
  return importContent(JSON.parse(raw))
}

test.group('Stock Riftbound', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test("l'import crée les extensions et les cartes, et peut être relancé", async ({
    assert,
    client,
  }) => {
    const first = await loadFixture()
    assert.equal(first.cards, 5)
    const second = await loadFixture()
    assert.equal(second.cards, 5)

    const response = await client.get('/api/v1/sets')
    response.assertStatus(200)
    assert.lengthOf(response.body() as any, 2)
    assert.equal((response.body() as any)[0].id, 'TST')
    assert.equal((response.body() as any)[0].totalCards, 4)
  })

  test('le pourcentage du masterset compte les cartes distinctes possédées', async ({
    assert,
    client,
  }) => {
    await loadFixture()
    const a = await client.post('/api/v1/copies').json({ cardId: 'TST-001', quantity: 3 })
    a.assertStatus(201)
    const b = await client.post('/api/v1/copies').json({ cardId: 'TST-002' })
    b.assertStatus(201)

    const sets = await client.get('/api/v1/sets')
    const tst = (sets.body() as any).find((s: any) => s.id === 'TST')
    assert.equal(tst.ownedCards, 2)
    assert.equal(tst.totalCopies, 4)
    assert.equal(tst.completion, 50)

    const detail = await client.get('/api/v1/sets/TST')
    assert.equal((detail.body() as any).cards.find((c: any) => c.id === 'TST-001').owned, 3)
  })

  test('les exemplaires sont rangés et affectés aux decklists', async ({ assert, client }) => {
    await loadFixture()
    const box = await client.post('/api/v1/storage-locations').json({ name: 'Classeur 1' })
    box.assertStatus(201)
    const boxId = (box.body() as any).id

    const added = await client
      .post('/api/v1/copies')
      .json({ cardId: 'TST-001', quantity: 2, storageLocationId: boxId })
    added.assertStatus(201)

    const deck = await client.post('/api/v1/decklists').json({ name: 'Mon deck' })
    const deckId = (deck.body() as any).id

    const imported = await client
      .post(`/api/v1/decklists/${deckId}/import`)
      .json({ text: '3 Carte Alpha\n1x TST-003\n2 Carte inconnue' })
    assert.equal((imported.body() as any).imported, 2)
    assert.deepEqual((imported.body() as any).notFound, ['2 Carte inconnue'])

    const auto = await client.post(`/api/v1/decklists/${deckId}/auto-assign`)
    assert.equal((auto.body() as any).assigned, 2)

    const detail = await client.get(`/api/v1/decklists/${deckId}`)
    assert.equal((detail.body() as any).totalCards, 4)
    assert.equal((detail.body() as any).assignedCopies, 2)
    assert.equal((detail.body() as any).missingCards, 2)
    const alpha = (detail.body() as any).entries.find((e: any) => e.card.id === 'TST-001')
    assert.lengthOf(alpha.assigned, 2)
    assert.equal(alpha.assigned[0].storageLocation.name, 'Classeur 1')

    const location = await client.get(`/api/v1/storage-locations/${boxId}`)
    assert.lengthOf((location.body() as any).copies, 2)
    assert.equal((location.body() as any).copies[0].decklist.name, 'Mon deck')

    const rel = await client.post(`/api/v1/decklists/${deckId}/release`)
    rel.assertStatus(200)
    const free = await client.get('/api/v1/copies').qs({ decklistId: 'none' })
    assert.lengthOf(free.body() as any, 2)
  })

  test('supprimer un rangement garde les exemplaires', async ({ assert, client }) => {
    await loadFixture()
    const box = await client.post('/api/v1/storage-locations').json({ name: 'Boîte' })
    await client
      .post('/api/v1/copies')
      .json({ cardId: 'TST-004', storageLocationId: (box.body() as any).id })
    const del = await client.delete(`/api/v1/storage-locations/${(box.body() as any).id}`)
    del.assertStatus(204)
    const copies = await client.get('/api/v1/copies').qs({ storageLocationId: 'none' })
    assert.lengthOf(copies.body() as any, 1)
  })
})
