import { useState, useEffect } from "react";
import { getNextEvolutions } from "../api/pokeapi.api";
import { MAX_FRIENDSHIP, type MyPokemon } from "../lib/box";
import type { EvolutionRequirement, NextEvolution } from "../lib/pokemon";

/**
 * 포켓몬의 진화 정보 및 조건을 관리하는 훅
 */
export function useEvolution(pokemon: MyPokemon) {
  // 렌더링 중에 이전 ID와 비교하여 상태를 초기화하는 패턴
  const [data, setData] = useState<{
    id: number;
    list: NextEvolution[] | undefined;
  }>({
    id: pokemon.pokemonId,
    list: undefined,
  });

  // 포켓몬 ID가 변경되면 즉시(렌더링 중) 목록을 undefined로 초기화하여 로딩 상태 유도
  if (pokemon.pokemonId !== data.id) {
    setData({
      id: pokemon.pokemonId,
      list: undefined,
    });
  }

  useEffect(() => {
    let ignore = false;

    getNextEvolutions(pokemon.pokemonId, pokemon.evolutionChainUrl).then(
      (res) => {
        if (!ignore) {
          setData({
            id: pokemon.pokemonId,
            list: res,
          });
        }
      },
    );

    return () => {
      ignore = true;
    };
  }, [pokemon.pokemonId, pokemon.evolutionChainUrl]);

  /** 특정 진화 조건을 만족하는지 확인 */
  const checkMeetsRequirement = (req: EvolutionRequirement): boolean => {
    switch (req.kind) {
      case "level":
        return pokemon.level >= req.minLevel;
      case "friendship":
        return pokemon.friendship >= MAX_FRIENDSHIP;
      case "item":
        return pokemon.heldItem === req.itemKey;
      case "unsupported":
      default:
        return false;
    }
  };

  return { nextEvolutions: data.list, checkMeetsRequirement };
}
