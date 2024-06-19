#! /bin/bash

trash ../public/photolog/blur
mkdir -p ../public/photolog/blur

for year in {2021..2023}; do 
  mkdir -p ../public/photolog/blur/$year
    for img in ../public/photolog/sq/$year/*.jpeg; do
      if [[ $img =~ [0-9]+\.jpeg$ ]]; then
        filename=${BASH_REMATCH[0]}
        ffmpeg -i $img -vf scale=10:-2 ../public/photolog/blur/$year/$filename
        unset filename
      fi
  done
done
