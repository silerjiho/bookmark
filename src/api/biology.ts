import { readIssues, type GitHubIssue } from './github';
import { getImage } from './pokeapi';
import type { PokemonData } from '../lib/pokemon';

/** (레거시) 과거 JSON 본문에서 사용하던 포켓몬 생물도감 표현. */
export interface PokemonBiology {
  id: string;
  pokemon: string;
  pokemonImage: string;
  videoTitle: string;
  videoLink: string;
  primaryQuestion: string;
  relatedPokemon: PokemonData[];
}

function parseLegacyJson(body: string) {
  const jsonMatch = body.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) throw new Error("No JSON block in body");
  const cleaned = jsonMatch[1]
    .replace(/,+/g, ",")
    .replace(/,\s*}/g, "}")
    .replace(/,\s*\]/g, "]")
    .replace(/(\r\n|\n|\r)/gm, "")
    .trim();
  return JSON.parse(cleaned);
}

/** (레거시) 과거 생물도감 화면용 데이터를 가져옵니다. 현재 앱에서는 사용하지 않습니다. */
export async function readBiology(): Promise<PokemonBiology[]> {
  const issues = await readIssues();

  const documents = await Promise.all(
    issues.map(async (issue: GitHubIssue) => {
      try {
        const rawDoc = parseLegacyJson(issue.body || '');

        const pokemonImage = await getImage(rawDoc.pokemon);
        const relatedPokemonNames: string[] = rawDoc.relatedPokemon || [];

        const relatedPokemon = await Promise.all(
          relatedPokemonNames.map(async (name) => ({
            name,
            image: await getImage(name),
          }))
        );

        return {
          id: rawDoc.id,
          pokemon: rawDoc.pokemon,
          pokemonImage,
          videoTitle: rawDoc.videoTitle,
          videoLink: rawDoc.videoLink || '',
          primaryQuestion: rawDoc.primaryQuestion,
          relatedPokemon,
        };
      } catch (e) {
        console.error(`Failed to process issue #${issue.number}`, e);
        return null;
      }
    })
  );

  return documents.filter((doc): doc is PokemonBiology => doc !== null);
}
