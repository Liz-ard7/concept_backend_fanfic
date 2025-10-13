---
timestamp: 'Mon Oct 13 2025 15:26:21 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251013_152621.b61df556.md]]'
content_id: 11ae5a9a09611632d7b8de11ee9edfab5fe8e7037282cd93dfad75a70f91fdf7
---

# file: ..\intro-gemini-schedule\dayplanner-tests.ts

```typescript
/**
 * Categorization Test Cases
 *
 * Demonstrates tag suggestion, removal, ficCat deletion, ficCats deletion
 */

import { Categorization, Fic } from './dayplanner';
import { GeminiLLM, Config } from './gemini-llm';

/**
 * Load configuration from config.json
 */
function loadConfig(): Config {
    try {
        const config = require('../config.json');
        return config;
    } catch (error) {
        console.error('❌ Error loading config.json. Please ensure it exists with your API key.');
        console.error('Error details:', (error as Error).message);
        process.exit(1);
    }
}

/**
 * Test case 1: Tag Suggestion
 * Demonstrates suggesting tags like main characters
 */
export async function testTagSuggestion(): Promise<void> {
    console.log('\n🧪 TEST CASE 1: Tag Suggestion');
    console.log('==================================');

    const config = loadConfig();
    const llm = new GeminiLLM(config);

    const title = "Gaster gets revealed";
    const text = "Sans walked up to gaster and was like omg its yOU! I love you <3 and gaster didnt have the heart to tell him he was evil now :( and then iron man showed up and shot them all with lazers hahahaha but sans was a skeleton and was like omg iron man ur so cool i love you too";
    const proposedTags = ["awesome fic!!", "Iron Man", "Iron Man & Sans"];
    const fic: Fic = {title: title, text: text, authorTags: proposedTags};

    const category = new Categorization();

    console.log('📝 Synthesizing tags');
    await category.keywordGeneratorTagCleaner(llm, fic);

    const suggestions = category.tagsToString(fic);
    console.log(suggestions);
}

/**
 * Test case 2: Tag Removal
 * Demonstrates removing tags when they don't matter to the story
 */
export async function testTagRemoval(): Promise<void> {
    console.log('\n🧪 TEST CASE 2: Tag Removal');
    console.log('========================================');

    const config = loadConfig();
    const llm = new GeminiLLM(config);

    const title = "Why are there so many ladybug crossovers";
    const text = "Batman was hanging out with robin when suddenly danny phantom and NOBODY ELSE showed up because why are there so many of those crossovers seriously. Anyways Danny Phantom was like Hi and Batman was like omg do you want to be adopted. Ladybug and 007n7 briefly appears in background. The end";
    const proposedTags = ["Iron Man", "Sans", "Gaster", "Ladybug", "Danny Phantom", "c00lkidd", "007n7"];
    const fic: Fic = {title: title, text: text, authorTags: proposedTags};

    const category = new Categorization();

    console.log('📝 Synthesizing tags');
    await category.keywordGeneratorTagCleaner(llm, fic);

    const suggestions = category.tagsToString(fic);
    console.log(suggestions);
}

/**
 * Test case 3: Tag Categories Deletion
 * Demonstrates deleting multiple ficCategories from Categorization
 */
export async function testTagCategoriesDeletion(): Promise<void> {
    //Most of the fanfics were written as suggestions by my friends. Blame them.

    // Also note: deleting ficCategories doesn't remove *all* ficCategories from category,
    // it only removes a set of ficCategories, recursively
    // This is to be used when a user wants to delete their account, which would mean
    // Deleting multiple ficCategories, but not all of them.

    console.log('\n🧪 TEST CASE 3: Multiple Deletion of FicCategories');
    console.log('========================================');

    const config = loadConfig();
    const llm = new GeminiLLM(config);

    const title = "These Fics Will be Deleted Like an AO3 Author Finding Fics From When They Were 10";
    const text = "Five Nights at Freddys. What if instead of scaring people the animatronics were really nice actually and just wanted to be friends! But then the nightguard (Michael Afton) was so scared and died anyways of a heart attack. This theory is very plausible. My name is Matpat.";
    const proposedTags = ["Theory", "Game Theory", "Matpat", "Freddy Fast Bear", "Michael Afton", "William Afton"];
    const fic: Fic = {title: title, text: text, authorTags: proposedTags};

    const category = new Categorization();

    console.log('📝 Synthesizing tags');
    await category.keywordGeneratorTagCleaner(llm, fic);

    const suggestions = category.tagsToString(fic);
    console.log(suggestions);

    const title2 = "Just search up voltron ships yeah";
    const text2 = "sigh. picture this. space 20247, scooby assasination has been faked, he was hidden by the govt for years upon years as the mysetery E administration was destoyed, but dean uhhh shaggy waited for him, for millenia after the war ravaged. finally they awoke. Shaggy looked Scooby in the eyes and was like 'like scoob where did the earth go`. Raggy. suddenly the spaceship rocked, a BLUR OF BLUE! SHADOW THE EDGEHOG!!! like scoob thats one of my sitchuashonishps situationships. Raggy you cheated on me??? Listen man after velma";
    const proposedTags2 = ["#enemiestolovers", "my boo thang", "Voltron", "Spicy", "Don't get political with me (micky mouse)"];
    const fic2: Fic = {title: title2, text: text2, authorTags: proposedTags2};

    console.log('📝 Synthesizing tags');
    await category.keywordGeneratorTagCleaner(llm, fic2);

    const suggestions2 = category.tagsToString(fic2);
    console.log(suggestions2);

    const ficCat = category.viewFicCategory(fic);
    if(ficCat === undefined) {
        throw new Error("Fic didn't show up properly");
    }
    const ficCat2 = category.viewFicCategory(fic2);
    if(ficCat2 === undefined) {
        throw new Error("Fic2 didn't show up properly");
    }
    category.deleteFicCategories([ficCat, ficCat2]);
    if(category.viewFicCategory(fic) !== undefined) {
        throw new Error("Didn't delete ficCategories1 properly");
    }
    if(category.viewFicCategory(fic2) !== undefined) {
        throw new Error("Didn't delete ficCategories2 properly");
    }
}

/**
 * Test case 4: Deleting One FicCat
 * Demonstrates being able to delete just one FicCat
 */
export async function testDeletingFicCat(): Promise<void> {
    console.log('\n🧪 TEST CASE 4: Deleting one FicCat');
    console.log('=================================');

    const config = loadConfig();
    const llm = new GeminiLLM(config);

    const title = "I hATE overtagging";
    const text = "Although Michael Distortion hated being himself, and not The Distortion, a creature of pure chaos and duplicity, he couldn't help but yearn for the relationships the original Michael used to have as a human, before he died. Michael Distortion opened a doorway to Jon's room. Michael asked Jon if he wanted to be friends. And Jon said yes, knowing he needed to make powerful allies for the coming war.";
    const proposedTags = ["Iron Man", "Sans", "Michael Distortion", "Jon Sims", "Angst", "Fluff", "Gaster & Sans", "Michael & Jon"];
    const fic: Fic = {title: title, text: text, authorTags: proposedTags};

    const category = new Categorization();

    console.log('📝 Synthesizing tags');
    await category.keywordGeneratorTagCleaner(llm, fic);

    const suggestions = category.tagsToString(fic);
    console.log(suggestions);

    category.deleteFicCategory(fic);
    if(category.viewFicCategory(fic) !== undefined) {
        throw new Error("Didn't delete fic properly");
    }
}

/**
 * Test case 5: Hannah's choice
 */
export async function testHannah(): Promise<void> {
    console.log('\n🧪 TEST CASE 3: Hannah');
    console.log('=================================');

    const config = loadConfig();
    const llm = new GeminiLLM(config);

    const title = "I need to write it what";
    const text = "meow";
    const proposedTags = ["Polaris", "The Doom Slayer", "Father-Daughter Relationship", "Nolen"];
    const fic: Fic = {title: title, text: text, authorTags: proposedTags};

    const category = new Categorization();

    console.log('📝 Synthesizing tags');
    await category.keywordGeneratorTagCleaner(llm, fic);

    const suggestions = category.tagsToString(fic);
    console.log(suggestions);
}

/**
 * Test case 6: isa's choice
 * Demonstrates Isa's choice
 */
export async function testIsa(): Promise<void> {
    console.log('\n🧪 TEST CASE 6: isa');
    console.log('=================================');

    const config = loadConfig();
    const llm = new GeminiLLM(config);

    const title = "freddy (you're supposed to be on lockdown)";
    const text = `“Ar ar ar ar ar ar ar ar ar ar ar,” says Freddy menacingly as he looks down at Jax.



“You're not the furry one, I am!” Jax responds angrily. Jax begins to go into a fit of rage and transform into a werewolf when Pomni comes out from behind him.



“No Jax, this isn't you!” She exclaims. “You have love deep down in your heart.”



“LV you say?” A voice comes from afar. “It's been a long time since I've heard about that one.”



In walks a short skeleton man. Freddy Fazbear grows pale as he realizes he's about to have a bad time. Before anyone catches what's happening, Freddy runs off, leaving the skeleton man laughing in his wake.



“I guess he found my presence un-bear-able.” The skeleton says. “Name's Sans. Sans Undertale.”



Then Michael Distortion comes in and distorts everything and everything is distorted and he laughs really loud and Pomni abstracts and Jax abstracts and Sans realizes he's met his match.



“You won't get away with this,” says Sans, his blue orb glowing with rage.



“Get away with what?” Michael says. Then the world abstracts and everyone abstracts and Michael becomes an omnipotent, benevolent chaos god of the multiverse.`;
    const proposedTags = ["Freddy Fazbear", "Jax (TADC)", "Pomni (TADC)", "Sans", "Michael Distortion", "Alpha/Beta/Omega Dynamics", "Evil Sans", "Humor", "Abstraction", "Hurt/Comfort", "Alternate Universe-RPF", "Destiel", "There Was Only One Bed", "No Beta We Die Like Michael Distortion"];
    const fic: Fic = {title: title, text: text, authorTags: proposedTags};

    const category = new Categorization();

    console.log('📝 Synthesizing tags');
    await category.keywordGeneratorTagCleaner(llm, fic);

    const suggestions = category.tagsToString(fic);
    console.log(suggestions);
}

/**
 * Main function to run all test cases
 */
async function main(): Promise<void> {
    console.log('🎓 Categorization Test Suite');
    console.log('========================\n');

    try {
        // Run Isa's choice
        await testIsa();

        // Run tag suggestion
        await testTagSuggestion();

        // Run tag removal
        await testTagRemoval();

        // Run tag categories deletion
        await testTagCategoriesDeletion();

        // Run deleting one fic cat
        await testDeletingFicCat();

        // Run Hannah's choice
        // await testHannah();

        console.log('\n🎉 All test cases completed successfully!');

    } catch (error) {
        console.error('❌ Test error:', (error as Error).message);
        process.exit(1);
    }
}

// Run the tests if this file is executed directly
if (require.main === module) {
    main();
}

```

Do NOT define new concepts and do NOT create implementations. The only thing you should do is testing the Categorizing Implementation from implementation.md.

Be as short and concise as possible, as the prompt for the AI of this concept requires a lot of tokens that hit the max very quickly.
Have as FEW CALLS to categorizeFic as possible.

DO NOT Test upon the output of the AI, like seeing if suggested tags includes specific things. It is too underdetermined to test upon.
