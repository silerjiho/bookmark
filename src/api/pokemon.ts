export interface PokemonData {
  name: string;
  image: string;
}

const KOREAN_TO_ENGLISH_MAPPING: Record<string, string> = {
  야돈: "slowpoke",
  셀러: "shellder",
  야도란: "slowbro",
  야도킹: "slowking",
  피카츄: "pikachu",
  이브이: "eevee",
};

export async function getImage(name: string): Promise<string> {
  try {
    const englishName = KOREAN_TO_ENGLISH_MAPPING[name] || name;
    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${englishName.toLowerCase()}`,
    );
    if (!response.ok) return "";
    const data = await response.json();
    return (
      data.sprites.other["official-artwork"].front_default ||
      data.sprites.front_default ||
      ""
    );
  } catch (e) {
    console.error(`Failed to fetch PokeAPI for ${name}`, e);
    return "";
  }
}
