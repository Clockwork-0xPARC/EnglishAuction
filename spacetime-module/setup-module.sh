#!/bin/bash

cd "$(dirname "$0")"

spacetime publish englishauction --clear-database
sleep 3
spacetime call englishauction init_tournament
sleep 2
spacetime call englishauction register_player '["John"]'
spacetime call englishauction register_player '["Nate"]'
spacetime call englishauction register_player '["Tyler"]'
spacetime call englishauction add_words '[["HELLO", "WORLD", "LONDON", "CAB", "DIG", "DAG", "POG"]]'
spacetime call englishauction add_letters '[ [ [1, "A", 1], [2, "B", 2], [3, "C", 2], [4, "D", 2], [5, "E", 1], [6, "F", 2]] ]'
spacetime call englishauction add_letters '[ [ [7, "G", 2], [8, "H", 3], [9, "I", 1], [10, "J", 4], [11, "K", 2], [12, "L", 3]] ]'
spacetime call englishauction add_letters '[ [ [13, "M", 2], [14, "N", 3], [15, "O", 1], [16, "P", 4], [17, "Q", 2], [18, "L", 3]] ]'
spacetime call englishauction start_tournament
