import { readFile } from 'node:fs/promises'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import importContent from '#services/card_importer'
import User from '#models/user'
import StorageLocation from '#models/storage_location'

async function loadFixture() {
  const raw = await readFile(new URL('../fixtures/content.json', import.meta.url), 'utf8')
  return importContent(JSON.parse(raw))
}

let user: User

test.group('Stock Riftbound', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    user = await User.create({ email: 'ty@example.com', password: 'motdepasse123' })
    return cleanup
  })

  test("l'import crée les extensions et les cartes, et peut être relancé", async ({
    assert,
    client,
  }) => {
    const first = await loadFixture()
    assert.equal(first.cards, 5)
    const second = await loadFixture()
    assert.equal(second.cards, 5)

    const response = await client.get('/api/v1/sets').loginAs(user)
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
    const a = await client
      .post('/api/v1/copies')
      .loginAs(user)
      .json({ cardId: 'TST-001', quantity: 3 })
    a.assertStatus(201)
    const b = await client.post('/api/v1/copies').loginAs(user).json({ cardId: 'TST-002' })
    b.assertStatus(201)

    const sets = await client.get('/api/v1/sets').loginAs(user)
    const tst = (sets.body() as any).find((s: any) => s.id === 'TST')
    assert.equal(tst.ownedCards, 2)
    assert.equal(tst.totalCopies, 4)
    assert.equal(tst.completion, 50)

    const detail = await client.get('/api/v1/sets/TST').loginAs(user)
    assert.equal((detail.body() as any).cards.find((c: any) => c.id === 'TST-001').owned, 3)
  })

  test('les exemplaires sont rangés et affectés aux decklists', async ({ assert, client }) => {
    await loadFixture()
    const box = await client
      .post('/api/v1/storage-locations')
      .loginAs(user)
      .json({ name: 'Classeur 1' })
    box.assertStatus(201)
    const boxId = (box.body() as any).id

    const added = await client
      .post('/api/v1/copies')
      .loginAs(user)
      .json({ cardId: 'TST-001', quantity: 2, storageLocationId: boxId })
    added.assertStatus(201)

    const deck = await client.post('/api/v1/decklists').loginAs(user).json({ name: 'Mon deck' })
    const deckId = (deck.body() as any).id

    const imported = await client
      .post(`/api/v1/decklists/${deckId}/import`)
      .loginAs(user)
      .json({ text: '3 Carte Alpha\n1x TST-003\n2 Carte inconnue' })
    assert.equal((imported.body() as any).imported, 2)
    assert.deepEqual((imported.body() as any).notFound, ['2 Carte inconnue'])

    const auto = await client.post(`/api/v1/decklists/${deckId}/auto-assign`).loginAs(user)
    assert.equal((auto.body() as any).assigned, 2)

    const detail = await client.get(`/api/v1/decklists/${deckId}`).loginAs(user)
    assert.equal((detail.body() as any).totalCards, 4)
    assert.equal((detail.body() as any).assignedCopies, 2)
    assert.equal((detail.body() as any).missingCards, 2)
    const alpha = (detail.body() as any).entries.find((e: any) => e.card.id === 'TST-001')
    assert.lengthOf(alpha.assigned, 2)
    assert.equal(alpha.assigned[0].storageLocation.name, 'Classeur 1')

    const location = await client.get(`/api/v1/storage-locations/${boxId}`).loginAs(user)
    assert.lengthOf((location.body() as any).copies, 2)
    assert.equal((location.body() as any).copies[0].decklist.name, 'Mon deck')

    const rel = await client.post(`/api/v1/decklists/${deckId}/release`).loginAs(user)
    rel.assertStatus(200)
    const free = await client.get('/api/v1/copies').loginAs(user).qs({ decklistId: 'none' })
    assert.lengthOf(free.body() as any, 2)
  })

  test('les données sont propres à chaque utilisateur', async ({ assert, client }) => {
    await loadFixture()
    const other = await User.create({ email: 'autre@example.com', password: 'motdepasse123' })
    const box = await client.post('/api/v1/storage-locations').loginAs(user).json({ name: 'Privé' })
    await client.post('/api/v1/copies').loginAs(user).json({ cardId: 'TST-001', quantity: 2 })

    const sets = await client.get('/api/v1/sets').loginAs(other)
    assert.equal((sets.body() as any)[0].ownedCards, 0)
    const copies = await client.get('/api/v1/copies').loginAs(other)
    assert.lengthOf(copies.body() as any, 0)

    const forbidden = await client
      .post('/api/v1/copies')
      .loginAs(other)
      .json({ cardId: 'TST-001', storageLocationId: (box.body() as any).id })
    forbidden.assertStatus(404)
    const show = await client
      .get(`/api/v1/storage-locations/${(box.body() as any).id}`)
      .loginAs(other)
    show.assertStatus(404)
  })

  test('il faut être connecté', async ({ client }) => {
    const response = await client.get('/api/v1/sets')
    response.assertStatus(401)
  })

  test('le premier compte est administrateur et récupère les données existantes', async ({
    assert,
    client,
  }) => {
    await User.query().delete()
    await loadFixture()
    await StorageLocation.create({ name: 'Ancien' })

    const signup = await client.post('/api/v1/auth/signup').json({
      email: 'premier@example.com',
      password: 'motdepasse123',
      passwordConfirmation: 'motdepasse123',
    })
    signup.assertStatus(200)
    const first = await User.findByOrFail('email', 'premier@example.com')
    assert.isTrue(Boolean(first.isAdmin))
    const locations = await client.get('/api/v1/storage-locations').loginAs(first)
    assert.lengthOf((locations.body() as any).locations, 1)

    const second = await client.post('/api/v1/auth/signup').json({
      email: 'second@example.com',
      password: 'motdepasse123',
      passwordConfirmation: 'motdepasse123',
    })
    second.assertStatus(200)
    const secondUser = await User.findByOrFail('email', 'second@example.com')
    assert.isFalse(Boolean(secondUser.isAdmin))
    const refused = await client.post('/api/v1/import').loginAs(secondUser).json({})
    refused.assertStatus(403)
  })

  test('supprimer un rangement garde les exemplaires', async ({ assert, client }) => {
    await loadFixture()
    const box = await client.post('/api/v1/storage-locations').loginAs(user).json({ name: 'Boîte' })
    await client
      .post('/api/v1/copies')
      .loginAs(user)
      .json({ cardId: 'TST-004', storageLocationId: (box.body() as any).id })
    const del = await client
      .delete(`/api/v1/storage-locations/${(box.body() as any).id}`)
      .loginAs(user)
    del.assertStatus(204)
    const copies = await client
      .get('/api/v1/copies')
      .loginAs(user)
      .qs({ storageLocationId: 'none' })
    assert.lengthOf(copies.body() as any, 1)
  })
})

test.group('Import RiftCodex', () => {
  test('convertit une carte RiftCodex au format interne', async ({ assert }) => {
    const { toCardDTO } = await import('#services/riftcodex_api')
    const dto = toCardDTO({
      id: 'abc',
      name: 'Blade Twirler',
      riftbound_id: 'ven-002-166',
      tcgplayer_id: null,
      collector_number: 2,
      attributes: { energy: 4, might: 4, power: null },
      classification: { type: 'Unit', supertype: null, rarity: 'Common', domain: ['Fury'] },
      text: { rich: '<p>x</p>', plain: 'Texte', flavour: null },
      set: { set_id: 'VEN', label: 'Vendetta' },
      media: { image_url: 'https://img/1.png', artist: 'Six More Vodka', accessibility_text: null },
      tags: ['Yordle'],
      orientation: 'portrait',
      metadata: {
        clean_name: null,
        updated_on: null,
        alternate_art: false,
        overnumbered: false,
        signature: false,
      },
    })
    assert.equal(dto.id, 'VEN-002-166')
    assert.equal(dto.set, 'VEN')
    assert.equal(dto.faction, 'Fury')
    assert.equal(dto.stats?.energy, 4)
    assert.equal(dto.art?.fullURL, 'https://img/1.png')
    assert.deepEqual(dto.tags, ['Yordle'])
  })
})

const USER_DECK = `Legend:
1 Rek'Sai, Void Burrower

Champion:
1 Rek'Sai, Breacher

MainDeck:
2 Bilgewater Tracker
2 Blood Rush
3 Carrion Dredger
3 Cleave
3 Cull the Weak
3 Faithful Manufactor
3 Falling Star
2 Imperial Decree
3 Inferna
1 Lingering Animus
3 Noxus Hopeful
2 Rage Amplifier
3 Trifarian Captain
3 Undertitan
2 Vanguard Captain
1 Vi, Peacekeeper

Battlefields:
1 Forbidding Waste
1 The Candlelit Sanctum
1 Trifarian War Camp

Runes:
6 Fury Rune
6 Order Rune

Sideboard:
3 Decree of Rage
1 Decree of Unity
2 Raucous Anthem
3 Salvage
1 Vi, Peacekeeper`

function deckFixture() {
  const names: [string, string][] = [
    ["Rek'sai - Void Burrower", 'Legend'],
    ["Rek'Sai - Breacher", 'Unit'],
    ['Bilgewater Tracker', 'Unit'],
    ['Blood Rush', 'Spell'],
    ['Carrion Dredger', 'Unit'],
    ['Cleave', 'Spell'],
    ['Cull the Weak', 'Spell'],
    ['Faithful Manufactor', 'Unit'],
    ['Falling Star', 'Spell'],
    ['Imperial Decree', 'Spell'],
    ['Inferna', 'Unit'],
    ['Lingering Animus', 'Spell'],
    ['Noxus Hopeful', 'Unit'],
    ['Rage Amplifier', 'Gear'],
    ['Trifarian Captain', 'Unit'],
    ['Undertitan', 'Unit'],
    ['Vanguard Captain', 'Unit'],
    ['Vi - Peacekeeper', 'Unit'],
    ['Forbidding Waste', 'Battlefield'],
    ['The Candlelit Sanctum', 'Battlefield'],
    ['Trifarian War Camp', 'Battlefield'],
    ['Fury Rune', 'Rune'],
    ['Order Rune', 'Rune'],
    ['Decree of Rage', 'Spell'],
    ['Decree of Unity', 'Spell'],
    ['Raucous Anthem', 'Spell'],
    ['Salvage', 'Spell'],
  ]
  const cards = names.map(([name, type], i) => ({
    id: `DCK-${String(i + 1).padStart(3, '0')}`,
    collectorNumber: i + 1,
    set: 'DCK',
    name,
    type,
    faction: type === 'Legend' ? 'Fury / Order' : name.startsWith('Order') ? 'Order' : 'Fury',
  }))
  // Variantes qui ne doivent pas être choisies à la place de la version de base
  cards.push(
    {
      id: 'DCK-900',
      collectorNumber: 900,
      set: 'DCK',
      name: 'Fury Rune (Alternate Art)',
      type: 'Rune',
      faction: 'Fury',
    },
    {
      id: 'PRM-001',
      collectorNumber: 1,
      set: 'PRM',
      name: 'Cleave',
      type: 'Spell',
      faction: 'Fury',
    }
  )
  return importContent({
    game: 'riftbound',
    version: 'deck',
    lastUpdated: '2026-01-01T00:00:00Z',
    sets: [
      { id: 'DCK', name: 'Deck set', cards: cards.filter((c) => c.set === 'DCK') },
      { id: 'PRM', name: 'Promo', cards: cards.filter((c) => c.set === 'PRM') },
    ],
  } as any)
}

test.group('Decklists par sections', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    user = await User.create({ email: 'ty@example.com', password: 'motdepasse123' })
    return cleanup
  })

  test("importe le copier-coller par sections et le réexporte à l'identique", async ({
    assert,
    client,
  }) => {
    await deckFixture()
    const deck = await client.post('/api/v1/decklists').loginAs(user).json({ name: "Rek'Sai" })
    const deckId = (deck.body() as any).id

    const imported = await client
      .post(`/api/v1/decklists/${deckId}/import`)
      .loginAs(user)
      .json({ text: USER_DECK })
    imported.assertStatus(200)
    const body = imported.body() as any
    assert.deepEqual(body.notFound, [])
    assert.deepEqual(body.sections, {
      legend: 1,
      champion: 1,
      main: 39,
      battlefield: 3,
      rune: 12,
      sideboard: 10,
    })

    const detailRes = await client.get(`/api/v1/decklists/${deckId}`).loginAs(user)
    const detail = detailRes.body() as any
    const bySection = (s: string) => detail.entries.filter((e: any) => e.section === s)
    assert.equal(bySection('legend')[0].card.name, "Rek'sai - Void Burrower")
    assert.equal(bySection('champion')[0].card.name, "Rek'Sai - Breacher")
    assert.isTrue(bySection('main').some((e: any) => e.card.name === 'Vi - Peacekeeper'))
    assert.isTrue(bySection('sideboard').some((e: any) => e.card.name === 'Vi - Peacekeeper'))
    assert.equal(bySection('rune').find((e: any) => e.card.name === 'Fury Rune').quantity, 6)
    assert.equal(bySection('main').find((e: any) => e.card.name === 'Cleave').card.id, 'DCK-006')
    assert.deepEqual(
      detail.sections.map((s: any) => s.section),
      ['legend', 'champion', 'main', 'battlefield', 'rune', 'sideboard']
    )

    const exported = await client.get(`/api/v1/decklists/${deckId}/export`).loginAs(user)
    const normalize = (t: string) =>
      t
        .toLowerCase()
        .trim()
        .split('\n\n')
        .map((block) => {
          const [header, ...lines] = block.split('\n')
          return [header, ...lines.sort()].join('\n')
        })
        .join('\n\n')
    assert.equal(normalize(exported.text()), normalize(USER_DECK))

    const listRes = await client.get('/api/v1/decklists').loginAs(user)
    const list = listRes.body() as any
    assert.equal(list[0].legend.name, "Rek'sai - Void Burrower")
    assert.include(list[0].domains, 'Fury')
    assert.deepEqual(list[0].legality, { legal: true, issues: 0 })

    // La liste d'exemple est légale : 1 légende, 1 + 39 cartes, 3 champs de bataille, 12 runes
    assert.isTrue(detail.legality.legal, detail.legality.issues.join('\n'))
    assert.deepEqual(
      detail.legality.sections.map((x: any) => [x.section, x.count, x.ok]),
      [
        ['legend', 1, true],
        ['champion', 1, true],
        ['main', 39, true],
        ['battlefield', 3, true],
        ['rune', 12, true],
        ['sideboard', 10, true],
      ]
    )

    // Un 4e Cleave en sideboard et une carte de moins en main deck rendent le deck illégal
    await client
      .put(`/api/v1/decklists/${deckId}/entries`)
      .loginAs(user)
      .json({ cardId: 'DCK-006', quantity: 1, section: 'sideboard' })
    await client
      .put(`/api/v1/decklists/${deckId}/entries`)
      .loginAs(user)
      .json({ cardId: 'DCK-004', quantity: 1, section: 'main' })
    const illegalRes = await client.get(`/api/v1/decklists/${deckId}`).loginAs(user)
    const illegal = (illegalRes.body() as any).legality
    assert.isFalse(illegal.legal)
    assert.deepEqual(illegal.issues, [
      'Main deck : 38 cartes, il en faut exactement 39.',
      'Sideboard : 11 cartes, il en faut 10 au plus.',
      'Cleave : 4 exemplaires (deck + sideboard), 3 au maximum.',
    ])
  })

  test('le champion doit correspondre à la légende et les cartes à ses domaines', async ({
    assert,
  }) => {
    const { checkLegality } = await import('#services/deck_legality')
    const result = checkLegality([
      {
        section: 'legend',
        quantity: 1,
        card: { name: 'Jinx - Loose Cannon', type: 'Legend', faction: 'Fury / Chaos' },
      },
      {
        section: 'champion',
        quantity: 1,
        card: { name: 'Vi - Peacekeeper', type: 'Unit', faction: 'Order' },
      },
      { section: 'rune', quantity: 12, card: { name: 'Calm Rune', type: 'Rune', faction: 'Calm' } },
      {
        section: 'battlefield',
        quantity: 2,
        card: { name: 'Same Place', type: 'Battlefield', faction: null },
      },
      {
        section: 'battlefield',
        quantity: 1,
        card: { name: 'Other Place', type: 'Battlefield', faction: null },
      },
    ])
    assert.isFalse(result.legal)
    assert.include(result.issues, 'Main deck : 0 carte, il en faut exactement 39.')
    assert.include(
      result.issues,
      'Le champion choisi (Vi - Peacekeeper) ne correspond pas à la Légende (Jinx - Loose Cannon).'
    )
    assert.include(result.issues, 'Les 3 champs de bataille doivent avoir des noms différents.')
    assert.include(
      result.issues,
      "Calm Rune n'est pas dans les domaines de la Légende (Fury / Chaos)."
    )
    assert.include(
      result.issues,
      "Vi - Peacekeeper n'est pas dans les domaines de la Légende (Fury / Chaos)."
    )
  })

  test('une même carte peut être en main deck et en sideboard', async ({ assert, client }) => {
    await deckFixture()
    const deck = await client.post('/api/v1/decklists').loginAs(user).json({ name: 'Vi' })
    const deckId = (deck.body() as any).id
    await client
      .put(`/api/v1/decklists/${deckId}/entries`)
      .loginAs(user)
      .json({ cardId: 'DCK-018', quantity: 2 })
    await client
      .put(`/api/v1/decklists/${deckId}/entries`)
      .loginAs(user)
      .json({ cardId: 'DCK-018', quantity: 1, section: 'sideboard' })
    await client.post('/api/v1/copies').loginAs(user).json({ cardId: 'DCK-018', quantity: 3 })
    const assigned = await client.post(`/api/v1/decklists/${deckId}/auto-assign`).loginAs(user)
    assert.equal((assigned.body() as any).assigned, 3)

    const detailRes = await client.get(`/api/v1/decklists/${deckId}`).loginAs(user)
    const detail = detailRes.body() as any
    assert.equal(detail.totalCards, 3)
    assert.equal(detail.missingCards, 0)
    assert.deepEqual(
      detail.entries.map((e: any) => [e.section, e.quantity, e.assigned.length]),
      [
        ['main', 2, 2],
        ['sideboard', 1, 1],
      ]
    )
  })
})

test.group('Rangement des decklists', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    user = await User.create({ email: 'ty@example.com', password: 'motdepasse123' })
    return cleanup
  })

  test('les exemplaires du deck vont dans sa deck box puis reviennent à leur place', async ({
    assert,
    client,
  }) => {
    await loadFixture()
    const location = async (name: string) => {
      const res = await client.post('/api/v1/storage-locations').loginAs(user).json({ name })
      return res.body() as any
    }
    const binder = await location('Classeur')
    const box = await location('Deck box')
    const box2 = await location('Deck box 2')

    await client
      .post('/api/v1/copies')
      .loginAs(user)
      .json({ cardId: 'TST-001', quantity: 2, storageLocationId: binder.id })
    await client.post('/api/v1/copies').loginAs(user).json({ cardId: 'TST-002' })

    const created = await client
      .post('/api/v1/decklists')
      .loginAs(user)
      .json({ name: 'Deck', storageLocationId: box.id })
    created.assertStatus(201)
    const deckId = (created.body() as any).id
    await client
      .put(`/api/v1/decklists/${deckId}/entries`)
      .loginAs(user)
      .json({ cardId: 'TST-001', quantity: 2 })
    await client
      .put(`/api/v1/decklists/${deckId}/entries`)
      .loginAs(user)
      .json({ cardId: 'TST-002', quantity: 1 })
    await client.post(`/api/v1/decklists/${deckId}/auto-assign`).loginAs(user)

    const copies = async () => {
      const res = await client.get('/api/v1/copies').loginAs(user)
      return (res.body() as any[]).map((c) => [c.cardId, c.storageLocationId, c.decklistId])
    }
    assert.deepEqual(await copies(), [
      ['TST-001', box.id, deckId],
      ['TST-001', box.id, deckId],
      ['TST-002', box.id, deckId],
    ])

    const detailRes = await client.get(`/api/v1/decklists/${deckId}`).loginAs(user)
    assert.equal((detailRes.body() as any).storageLocation.name, 'Deck box')
    const listRes = await client.get('/api/v1/decklists').loginAs(user)
    assert.equal((listRes.body() as any)[0].storageLocation.id, box.id)

    // Changer de deck box déplace les exemplaires
    const moved = await client
      .put(`/api/v1/decklists/${deckId}`)
      .loginAs(user)
      .json({ name: 'Deck', storageLocationId: box2.id })
    moved.assertStatus(200)
    const afterMove = await copies()
    assert.deepEqual(
      afterMove.map((c) => c[1]),
      [box2.id, box2.id, box2.id]
    )

    // Retirer un exemplaire le remet dans son rangement d'origine
    const allRes = await client.get('/api/v1/copies').loginAs(user)
    const first = (allRes.body() as any[])[0]
    await client
      .patch('/api/v1/copies')
      .loginAs(user)
      .json({ ids: [first.id], decklistId: null })
    const afterRemove = await copies()
    assert.deepEqual(afterRemove[0], ['TST-001', binder.id, null])

    // Libérer le deck : les autres reviennent aussi (le TST-002 n'avait pas de rangement)
    await client.post(`/api/v1/decklists/${deckId}/release`).loginAs(user)
    assert.deepEqual(await copies(), [
      ['TST-001', binder.id, null],
      ['TST-001', binder.id, null],
      ['TST-002', null, null],
    ])

    // Un exemplaire créé directement dans le deck va dans la deck box
    const direct = await client
      .post('/api/v1/copies')
      .loginAs(user)
      .json({ cardId: 'TST-002', decklistId: deckId })
    assert.equal((direct.body() as any)[0].storageLocationId, box2.id)

    // Supprimer la deck box retire le rangement du deck
    await client.delete(`/api/v1/storage-locations/${box2.id}`).loginAs(user)
    const afterRes = await client.get(`/api/v1/decklists/${deckId}`).loginAs(user)
    assert.isNull((afterRes.body() as any).storageLocation)
  })

  test("on ne peut pas utiliser le rangement d'un autre compte", async ({ client }) => {
    const other = await User.create({ email: 'autre@example.com', password: 'motdepasse123' })
    const box = await StorageLocation.create({ name: 'Pas à moi', userId: other.id })
    const res = await client
      .post('/api/v1/decklists')
      .loginAs(user)
      .json({ name: 'Deck', storageLocationId: box.id })
    res.assertStatus(404)
  })
})

test.group('Classeurs', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    user = await User.create({ email: 'ty@example.com', password: 'motdepasse123' })
    return cleanup
  })

  test('les exemplaires ont une pochette, conservée pendant un passage en deck', async ({
    assert,
    client,
  }) => {
    await loadFixture()
    const created = await client
      .post('/api/v1/storage-locations')
      .loginAs(user)
      .json({ name: 'Classeur', kind: 'binder', pageCount: 5 })
    created.assertStatus(201)
    const binder = created.body() as any
    assert.equal(binder.pocketsPerPage, 9)
    assert.equal(binder.pageCount, 5)
    const boxRes = await client
      .post('/api/v1/storage-locations')
      .loginAs(user)
      .json({ name: 'Deck box', kind: 'deck_box' })
    const box = boxRes.body() as any

    const addRes = await client
      .post('/api/v1/copies')
      .loginAs(user)
      .json({ cardId: 'TST-001', quantity: 2, storageLocationId: binder.id })
    const [a, b] = addRes.body() as any[]

    const placed = await client
      .put(`/api/v1/copies/${a.id}/slot`)
      .loginAs(user)
      .json({ page: 3, slot: 2 })
    placed.assertStatus(200)
    assert.equal((placed.body() as any).binderPage, 3)
    assert.equal((placed.body() as any).binderSlot, 2)

    const outside = await client
      .put(`/api/v1/copies/${a.id}/slot`)
      .loginAs(user)
      .json({ page: 6, slot: 1 })
    outside.assertStatus(422)

    // Placer b dans la pochette de a : les deux échangent (a n'avait que celle-là, b aucune)
    await client.put(`/api/v1/copies/${b.id}/slot`).loginAs(user).json({ page: 3, slot: 2 })
    const slots = async () => {
      const res = await client.get('/api/v1/copies').loginAs(user)
      return (res.body() as any[]).map((c) => [
        c.id,
        c.storageLocationId,
        c.binderPage,
        c.binderSlot,
      ])
    }
    assert.deepEqual(await slots(), [
      [a.id, binder.id, null, null],
      [b.id, binder.id, 3, 2],
    ])

    // b part dans un deck rangé en deck box, puis revient dans sa pochette
    const deckRes = await client
      .post('/api/v1/decklists')
      .loginAs(user)
      .json({ name: 'Deck', storageLocationId: box.id })
    const deckId = (deckRes.body() as any).id
    await client
      .patch('/api/v1/copies')
      .loginAs(user)
      .json({ ids: [b.id], decklistId: deckId })
    const s1 = await slots()
    assert.deepEqual(s1[1], [b.id, box.id, null, null])
    await client
      .patch('/api/v1/copies')
      .loginAs(user)
      .json({ ids: [b.id], decklistId: null })
    const s2 = await slots()
    assert.deepEqual(s2[1], [b.id, binder.id, 3, 2])

    // Réduire le classeur vide les pochettes qui n'existent plus
    await client
      .put(`/api/v1/storage-locations/${binder.id}`)
      .loginAs(user)
      .json({ name: 'Classeur', pageCount: 2 })
    const s3 = await slots()
    assert.deepEqual(s3[1], [b.id, binder.id, null, null])

    // La liste des rangements donne le type et un aperçu des cartes
    const listRes = await client.get('/api/v1/storage-locations').loginAs(user)
    const list = listRes.body() as any
    const listed = list.locations.find((l: any) => l.id === binder.id)
    assert.equal(listed.kind, 'binder')
    assert.equal(listed.pageCount, 2)
    assert.equal(listed.copies, 2)
    assert.isArray(listed.preview)
  })
})

test.group('Recherche de cartes', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    user = await User.create({ email: 'ty@example.com', password: 'motdepasse123' })
    await importContent({
      game: 'riftbound',
      version: 'search',
      lastUpdated: '2026-01-01T00:00:00Z',
      sets: [
        {
          id: 'OGN',
          name: 'Origins',
          cards: [
            {
              id: 'OGN-209-298',
              collectorNumber: 209,
              set: 'OGN',
              name: 'Cull the Weak',
              type: 'Spell',
            },
            {
              id: 'OGN-014-298',
              collectorNumber: 14,
              set: 'OGN',
              name: 'Blood Rush',
              type: 'Spell',
            },
          ],
        },
        {
          id: 'SFD',
          name: 'Spiritforged',
          cards: [
            { id: 'SFD-051-221', collectorNumber: 51, set: 'SFD', name: 'Salvage', type: 'Spell' },
          ],
        },
      ],
    } as any)
    return cleanup
  })

  test('trouve une carte par nom sans casse ou par code et numéro', async ({ assert, client }) => {
    const search = async (q: string) => {
      const res = await client.get('/api/v1/cards').qs({ q }).loginAs(user)
      res.assertStatus(200)
      return (res.body() as any).data.map((c: any) => c.name)
    }
    for (const q of [
      'cull the weak',
      'CULL THE WEAK',
      'Cull',
      'OGN 209',
      'ogn-209',
      'ogn209',
      'OGN',
      '209',
      '20',
      '09',
      '2',
      '9',
      '0',
      'OGN-209-298',
    ]) {
      assert.include(await search(q), 'Cull the Weak', `« ${q} » doit trouver Cull the Weak`)
    }
    assert.deepEqual(await search('OGN 209'), ['Cull the Weak'])
    assert.deepEqual(await search('209'), ['Cull the Weak'])
    assert.notInclude(await search('SFD'), 'Cull the Weak')
    assert.notInclude(await search('OGN 51'), 'Salvage')
    assert.deepEqual(await search('sfd 51'), ['Salvage'])
    assert.deepEqual(await search('50%'), [])
  })
})
