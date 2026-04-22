import { readIssues, parseBody, type GitHubIssue } from './github';
import { getImage, type PokemonData } from './pokemon';

export interface PokemonBiology {
  id: string;
  pokemon: string;
  pokemonImage: string;
  videoTitle: string;
  videoLink: string;
  primaryQuestion: string;
  relatedPokemon: PokemonData[];
}

export async function readBiology(): Promise<PokemonBiology[]> {
  const issues = await readIssues();

  const documents = await Promise.all(
    issues.map(async (issue: GitHubIssue) => {
      try {
        const rawDoc = parseBody(issue.body || '');

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
